const { SerialPort } = require('serialport');
const { readHoldingRegisters } = require('./modbus-rtu');

const RETRY_MS = 5000;

/** @type {import('serialport').SerialPort | null} */
let port = null;
let pollTimer = null;
let retryTimer = null;
let pollInFlight = false;
let active = false;

function getSensorCount() {
    return Math.max(1, parseInt(process.env.PLC_SENSOR_COUNT || '10', 10));
}

/** D1003 워드: bit0=센서1 … bit9=센서10 에러 */
function parseSensorErrorBits(word, count = getSensorCount()) {
    const bits = [];
    for (let i = 0; i < count; i++) {
        bits.push(Boolean(word & (1 << i)));
    }
    return bits;
}

function mapModbusRegisters(registers) {
    const levelMm = registers[0];
    const errorCode = registers[1];
    const sensorErrorWord = registers.length >= 3 ? registers[2] : 0;
    const sensorCount = getSensorCount();
    const sensor_error_bits = parseSensorErrorBits(sensorErrorWord, sensorCount);
    return {
        timestamp: new Date().toISOString(),
        source: 'modbus',
        water_level: levelMm,
        error_code: errorCode,
        machine_status: errorCode === 1,
        plc_off: errorCode === 0,
        sensor_error_bits,
        modbus: {
            d_water: parseInt(process.env.PLC_D_WATER || '1001', 10),
            d_error: parseInt(process.env.PLC_D_ERROR || '1002', 10),
            d_sensor_error: parseInt(process.env.PLC_D_SENSOR_ERROR || '1003', 10),
            sensor_error_word: sensorErrorWord,
            raw_words: registers,
        },
    };
}

function getConfig() {
    return {
        path: String(process.env.SERIAL_PORT || 'COM1').trim(),
        baudRate: parseInt(process.env.BAUD_RATE || '115200', 10),
        slaveId: parseInt(process.env.MODBUS_SLAVE_ID ?? '0', 10),
        regStart: parseInt(process.env.MODBUS_REG_START || '0', 10),
        regCount: parseInt(process.env.MODBUS_REG_COUNT || '3', 10),
        pollMs: Math.max(100, parseInt(process.env.WATER_LEVEL_POLL_MS || '500', 10)),
        timeoutMs: parseInt(process.env.MODBUS_TIMEOUT_MS || '800', 10),
    };
}

function scheduleRetry(startFn) {
    if (retryTimer) return;
    console.log(`[modbus] ${RETRY_MS / 1000}초 후 재연결 시도...`);
    retryTimer = setTimeout(() => {
        retryTimer = null;
        startFn();
    }, RETRY_MS);
}

function stopTimers() {
    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
}

/**
 * @param {{ ingest: (data: object) => boolean, onActiveChange?: (active: boolean) => void }} opts
 */
function startPlcModbusPoller(opts) {
    const cfg = getConfig();
    if (!cfg.path) {
        console.log('[modbus] SERIAL_PORT 미설정 — Modbus 비활성');
        active = false;
        opts.onActiveChange?.(false);
        return;
    }

    stopTimers();
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }

    if (port && port.isOpen) {
        port.close(() => {
            port = null;
            openPort(cfg, opts);
        });
        return;
    }

    openPort(cfg, opts);
}

function openPort(cfg, opts) {
    try {
        port = new SerialPort({
            path: cfg.path,
            baudRate: cfg.baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            autoOpen: true,
        });
    } catch (err) {
        console.error('[modbus] SerialPort 생성 실패:', err.message);
        active = false;
        opts.onActiveChange?.(false);
        scheduleRetry(() => startPlcModbusPoller(opts));
        return;
    }

    port.on('error', (err) => {
        console.error('[modbus] 포트 오류:', err.message);
        active = false;
        opts.onActiveChange?.(false);
        stopTimers();
        scheduleRetry(() => startPlcModbusPoller(opts));
    });

    port.on('close', () => {
        if (active) {
            console.warn('[modbus] 연결 끊김 — 재연결 예약');
        }
        active = false;
        opts.onActiveChange?.(false);
        stopTimers();
        scheduleRetry(() => startPlcModbusPoller(opts));
    });

    port.on('open', () => {
        active = true;
        opts.onActiveChange?.(true);
        console.log(
            `[modbus] ${cfg.path} @ ${cfg.baudRate}, slave=${cfg.slaveId}, ` +
            `FC03 reg ${cfg.regStart}+${cfg.regCount} (D${process.env.PLC_D_WATER || '1001'}~), ` +
            `poll ${cfg.pollMs}ms`
        );

        const scheduleNextPoll = (delayMs) => {
            if (port && port.isOpen) {
                pollTimer = setTimeout(pollOnce, delayMs);
            }
        };

        const pollOnce = async () => {
            if (!port || !port.isOpen || pollInFlight) return;
            const startedAt = Date.now();
            pollInFlight = true;
            try {
                const words = await readHoldingRegisters(
                    port,
                    cfg.slaveId,
                    cfg.regStart,
                    cfg.regCount,
                    cfg.timeoutMs
                );
                const payload = mapModbusRegisters(words);
                opts.ingest(payload);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[modbus] 읽기 실패:', err.message);
                }
            } finally {
                pollInFlight = false;
                const elapsedMs = Date.now() - startedAt;
                scheduleNextPoll(Math.max(0, cfg.pollMs - elapsedMs));
            }
        };

        pollOnce();
    });
}

function getModbusStatus() {
    const cfg = getConfig();
    return {
        active,
        path: cfg.path,
        baudRate: cfg.baudRate,
        slaveId: cfg.slaveId,
        regStart: cfg.regStart,
        regCount: cfg.regCount,
        pollMs: cfg.pollMs,
        dWater: parseInt(process.env.PLC_D_WATER || '1001', 10),
        dError: parseInt(process.env.PLC_D_ERROR || '1002', 10),
        dSensorError: parseInt(process.env.PLC_D_SENSOR_ERROR || '1003', 10),
        sensorCount: getSensorCount(),
    };
}

module.exports = {
    startPlcModbusPoller,
    getModbusStatus,
    mapModbusRegisters,
    parseSensorErrorBits,
};
