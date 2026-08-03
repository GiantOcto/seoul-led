function computeCrc(data) {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xa001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

function buildReadHoldingRegisters(slaveAddress, startAddress, registerCount) {
    const frame = Buffer.alloc(8);
    frame[0] = slaveAddress & 0xff;
    frame[1] = 0x03;
    frame[2] = (startAddress >> 8) & 0xff;
    frame[3] = startAddress & 0xff;
    frame[4] = (registerCount >> 8) & 0xff;
    frame[5] = registerCount & 0xff;
    const crc = computeCrc(frame.subarray(0, 6));
    frame[6] = crc & 0xff;
    frame[7] = (crc >> 8) & 0xff;
    return frame;
}

function readFrame(port, timeoutMs) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let received = 0;
        let timer = null;
        let finished = false;

        const cleanup = () => {
            if (timer) clearTimeout(timer);
            port.off('data', onData);
            port.off('error', onError);
        };

        const finish = (err, buf) => {
            if (finished) return;
            finished = true;
            cleanup();
            if (err) reject(err);
            else resolve(buf);
        };

        const checkComplete = () => {
            if (received < 5) return;

            const buf = Buffer.concat(chunks, received);
            if (buf[1] & 0x80) {
                finish(null, buf.subarray(0, 5));
                return;
            }

            const byteCount = buf[2];
            const expectedLength = 3 + byteCount + 2;
            if (received >= expectedLength) {
                finish(null, buf.subarray(0, expectedLength));
            }
        };

        const onError = (err) => finish(err);

        const onData = (chunk) => {
            chunks.push(chunk);
            received += chunk.length;
            checkComplete();
        };

        timer = setTimeout(() => {
            finish(new Error('Modbus response timeout'));
        }, timeoutMs);

        port.on('data', onData);
        port.on('error', onError);

        const buffered = port.read();
        if (buffered) {
            chunks.push(buffered);
            received += buffered.length;
            checkComplete();
        }
    });
}

/**
 * Read holding registers with Modbus RTU function code 03.
 *
 * @param {import('serialport').SerialPort} port
 * @param {number} slaveAddress 0~247
 * @param {number} startAddress Modbus PDU start address
 * @param {number} registerCount
 * @param {number} timeoutMs
 * @returns {Promise<number[]>} 16-bit register values
 */
async function readHoldingRegisters(port, slaveAddress, startAddress, registerCount, timeoutMs = 800) {
    if (!port || !port.isOpen) {
        throw new Error('Serial port is not open.');
    }

    while (port.readableLength > 0) {
        port.read();
    }

    const request = buildReadHoldingRegisters(slaveAddress, startAddress, registerCount);
    await new Promise((resolve, reject) => {
        port.write(request, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
        port.drain((err) => (err ? reject(err) : resolve()));
    });

    const response = await readFrame(port, timeoutMs);
    const header = response.subarray(0, 3);

    if (header[0] !== (slaveAddress & 0xff)) {
        throw new Error(`Modbus slave mismatch: expected ${slaveAddress}, received ${header[0]}`);
    }
    if (header[1] & 0x80) {
        throw new Error(`Modbus exception response: code ${response[2]}`);
    }
    if (header[1] !== 0x03) {
        throw new Error(`Modbus function mismatch: received ${header[1]}`);
    }

    const byteCount = header[2];
    if (byteCount !== registerCount * 2) {
        throw new Error(`Modbus byte count mismatch: expected ${registerCount * 2}, received ${byteCount}`);
    }

    const payload = response.subarray(3);
    const crcRx = payload[byteCount] | (payload[byteCount + 1] << 8);
    const crcCalc = computeCrc(response.subarray(0, 3 + byteCount));
    if (crcRx !== crcCalc) {
        throw new Error('Modbus CRC mismatch');
    }

    const registers = [];
    for (let i = 0; i < registerCount; i++) {
        registers.push((payload[i * 2] << 8) | payload[i * 2 + 1]);
    }
    return registers;
}

module.exports = {
    computeCrc,
    buildReadHoldingRegisters,
    readHoldingRegisters,
};
