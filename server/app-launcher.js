const path = require('path');
const { runLedwin, runAsAdminTask } = require('./ledwin');

// 헤더 "ViPlex" · "Relay 리셋" 버튼 — 같은 PC 의 다른 프로그램을 켜거나 다시 켬 (실제 일은 ledwin.exe 가 함)
const PROGRAM_FILES = process.env.ProgramFiles || 'C:\\Program Files';
const PROGRAM_FILES_X86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
const FRONT_WAIT_SEC = 300; // 느린 현장 PC 는 ViPlex 가 뜨는 데 30초 넘게 걸림 (ledwin 이 창을 기다리는 시간)
const CLOSE_WAIT_SEC = 15; // 다시 켜기 전에 창 닫기로 꺼지길 기다리는 시간 (넘으면 강제 종료)
const READY_WAIT_SEC = 120; // 다시 켠 뒤 본 창이 뜰 때까지 기다리는 시간 (릴레이 시스템은 시작 화면만 5초)

/**
 * mode 'front'  : 꺼져 있으면 켜고, 창을 제자리에 놓아 맨 앞으로 (ledwin front-viplex).
 *                 ViPlex 는 켤 때 관리자 권한을 요구해서 관리자 권한 작업(taskName)으로 돌림 — 없으면 직접 실행
 * mode 'restart': 켜져 있으면 끄고 다시 켬, 꺼져 있으면 켬. 본 창이 뜰 때까지 기다림 (ledwin restart).
 *                 화면의 "켜는 중" 안내가 그동안 떠 있음
 *   exeList    : 설치 위치 후보 — 앞에서부터 실제로 있는 것을 실행
 *   splashTitle: 시작 화면 창 제목 — 이 창 말고 다른 창이 떠야 다 켜진 걸로 봄
 */
const APPS = {
    viplex: {
        label: 'ViPlex',
        mode: 'front',
        taskName: 'GaramLED ViPlex',
        args: ['front-viplex'],
    },
    relay: {
        label: '릴레이 시스템',
        mode: 'restart',
        processName: 'RelaySystem_GUI',
        exeList: [
            'C:\\Relay System\\RelaySystem_GUI.exe',
            path.join(PROGRAM_FILES, 'Relay System', 'RelaySystem_GUI.exe'),
            path.join(PROGRAM_FILES_X86, 'Relay System', 'RelaySystem_GUI.exe'),
        ],
        splashTitle: 'SplashScreen',
    },
};

/** 창이 뜨길 기다리는 시간(초) — front 는 맨 앞으로 올릴 창, restart 는 다시 켠 뒤의 본 창 */
function windowWaitSec(app) {
    return app.mode === 'front' ? FRONT_WAIT_SEC : READY_WAIT_SEC;
}

/** 실행 오류(없으면 성공) → { ok: true } | { ok: false, error } — 화면엔 팝업 없이 서버 로그에만 */
function resultFromExit(app, err) {
    if (!err) return { ok: true };
    if (err.code === 2) return { ok: false, error: `${app.label} 가 설치되어 있지 않습니다.` };
    if (err.code === 3) return { ok: false, error: `${app.label} 창이 ${windowWaitSec(app) / 60}분 안에 뜨지 않았습니다.` };
    if (err.code === 4) return { ok: false, error: `${app.label} 가 꺼지지 않아 다시 켜지 못했습니다.` };
    return { ok: false, error: `${app.label} 를 켜지 못했습니다. (${err.message})` };
}

/** ledwin restart 에 넘길 인자 */
function restartArgs(app) {
    return [
        'restart',
        '--process', app.processName,
        '--exe-list', app.exeList.join('|'),
        '--splash-title', app.splashTitle,
        '--wait', String(READY_WAIT_SEC),
        '--close-wait', String(CLOSE_WAIT_SEC),
    ];
}

async function runApp(app) {
    const err = app.mode === 'front'
        ? await runAsAdminTask({ taskName: app.taskName, args: app.args, waitSec: FRONT_WAIT_SEC })
        : await runLedwin(restartArgs(app), READY_WAIT_SEC + CLOSE_WAIT_SEC);
    return resultFromExit(app, err);
}

const pending = {}; // 진행 중에 버튼을 또 눌러도 두 번 실행하지 않게, 프로그램별로 진행 중인 요청을 같이 씀

/**
 * @param {'viplex' | 'relay'} key
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
function launchApp(key, run = runApp) {
    if (!pending[key]) {
        pending[key] = run(APPS[key]).finally(() => {
            delete pending[key];
        });
    }
    return pending[key];
}

module.exports = { launchApp, resultFromExit, restartArgs, APPS };
