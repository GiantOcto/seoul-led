const { runAsAdminTask } = require('./ledwin');

// 헤더 "NovaLCT" 버튼 — NovaLCT 창을 맨 앞으로 (꺼져 있으면 실행). 창 다루기는 ledwin.exe front-novalct 가 함
// NovaLCT 는 켤 때 관리자 권한을 요구해서, 설치할 때 등록해 둔 관리자 권한 작업으로 돌림 (없으면 직접 실행)
const FRONT_JOB = {
    taskName: 'GaramLED NovaLCT',
    args: ['front-novalct'],
    waitSec: 300, // 창을 최대 5분 기다림 (느린 현장 PC 는 로딩에 1분 넘게 걸림)
};

// ledwin 끝 코드 → 서버 로그에 남길 메시지 (화면엔 팝업을 띄우지 않음)
const EXIT_MESSAGES = {
    2: 'NovaLCT 가 설치되어 있지 않습니다.',
    3: 'NovaLCT 창이 5분 안에 뜨지 않았습니다.',
};

/** 실행 오류(없으면 성공) → { ok: true } | { ok: false, error } */
function resultFromExit(err) {
    if (!err) return { ok: true };
    return { ok: false, error: EXIT_MESSAGES[err.code] || `NovaLCT 창을 띄우지 못했습니다. (${err.message})` };
}

async function runFront() {
    return resultFromExit(await runAsAdminTask(FRONT_JOB));
}

let pending = null; // 켜지는 동안 버튼을 또 눌러도 NovaLCT 를 두 번 실행하지 않게 진행 중인 요청을 같이 씀

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
function bringNovaLctToFront(run = runFront) {
    if (!pending) {
        pending = run().finally(() => {
            pending = null;
        });
    }
    return pending;
}

module.exports = { bringNovaLctToFront, resultFromExit };
