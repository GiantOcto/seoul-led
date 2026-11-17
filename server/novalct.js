const path = require('path');
const { execFile } = require('child_process');

// 헤더 "NovaLCT" 버튼 — NovaLCT 창을 맨 앞으로 (꺼져 있으면 실행). 창 다루기는 novalct-front.ps1 이 함
const SCRIPT = path.join(__dirname, 'novalct-front.ps1');
const SCRIPT_TIMEOUT_MS = 330 * 1000; // 스크립트가 창을 최대 5분 기다림 + PowerShell 시작 여유

// novalct-front.ps1 끝 코드 → 서버 로그에 남길 메시지 (화면엔 팝업을 띄우지 않음)
const EXIT_MESSAGES = {
    2: 'NovaLCT 가 설치되어 있지 않습니다.',
    3: 'NovaLCT 창이 5분 안에 뜨지 않았습니다.',
};

/** execFile 오류(없으면 성공) → { ok: true } | { ok: false, error } */
function resultFromExit(err) {
    if (!err) return { ok: true };
    return { ok: false, error: EXIT_MESSAGES[err.code] || `NovaLCT 창을 띄우지 못했습니다. (${err.message})` };
}

function runFrontScript() {
    return new Promise((resolve) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT],
            { windowsHide: true, timeout: SCRIPT_TIMEOUT_MS },
            (err) => resolve(resultFromExit(err)),
        );
    });
}

let pending = null; // 켜지는 동안 버튼을 또 눌러도 NovaLCT 를 두 번 실행하지 않게 진행 중인 요청을 같이 씀

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
function bringNovaLctToFront(run = runFrontScript) {
    if (!pending) {
        pending = run().finally(() => {
            pending = null;
        });
    }
    return pending;
}

module.exports = { bringNovaLctToFront, resultFromExit };
