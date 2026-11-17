const path = require('path');
const { execFile } = require('child_process');

// 헤더 "해상도" 버튼 — 주 모니터 해상도를 1920x1080 으로 강제 설정. 실제 변경은 set-resolution.ps1 이 함
const SCRIPT = path.join(__dirname, 'set-resolution.ps1');
const SCRIPT_TIMEOUT_MS = 30 * 1000;

// set-resolution.ps1 끝 코드 → 서버 로그에 남길 메시지 (화면엔 팝업을 띄우지 않음)
const EXIT_MESSAGES = {
    2: '현재 해상도를 읽지 못했습니다.',
    3: '윈도우가 1920x1080 변경을 거부했습니다. (모니터가 지원하지 않는 해상도일 수 있음)',
};

/** execFile 오류(없으면 성공) + 스크립트 출력 → { ok: true } | { ok: false, error } — 출력(시도한 모드·윈도우 응답)은 원인 확인용으로 뒤에 붙임 */
function resultFromExit(err, output = '') {
    if (!err) return { ok: true };
    const reason = EXIT_MESSAGES[err.code] || `해상도를 바꾸지 못했습니다. (${err.message})`;
    const detail = String(output).trim().split(/\r?\n/).join(' / ');
    return { ok: false, error: detail ? `${reason} [${detail}]` : reason };
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
function setResolution() {
    return new Promise((resolve) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT],
            { windowsHide: true, timeout: SCRIPT_TIMEOUT_MS },
            (err, stdout) => resolve(resultFromExit(err, stdout)),
        );
    });
}

module.exports = { setResolution, resultFromExit };
