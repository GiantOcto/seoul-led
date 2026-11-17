const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

// 헤더 "윈도우 설정" · "윈도우 다시 시작" 버튼
const PROGRAM_ROOT = path.resolve(__dirname, '..');
const SETTINGS_SCRIPT = path.join(__dirname, 'windows-settings.ps1');
const SETTINGS_TIMEOUT_MS = 60 * 1000; // 스크립트가 창을 최대 30초 기다림 + PowerShell 시작 여유
const RESTART_DELAY_SEC = 3; // 화면에 응답을 먼저 보낸 뒤 다시 시작

/** execFile 오류(없으면 성공) → { ok: true } | { ok: false, error } — 화면엔 팝업 없이 서버 로그에만 */
function settingsResultFromExit(err) {
    if (!err) return { ok: true };
    const reason = err.code === 3 ? '윈도우 설정 창이 30초 안에 뜨지 않았습니다.' : `윈도우 설정을 열지 못했습니다. (${err.message})`;
    return { ok: false, error: reason };
}

/** 윈도우 설정 창을 LED 를 안 가리는 가운데 자리에 작게 띄움 (windows-settings.ps1) */
function openWindowsSettings() {
    return new Promise((resolve) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SETTINGS_SCRIPT],
            { windowsHide: true, timeout: SETTINGS_TIMEOUT_MS },
            (err) => resolve(settingsResultFromExit(err)),
        );
    });
}

function runRestart() {
    spawn('shutdown.exe', ['/r', '/t', String(RESTART_DELAY_SEC)], { stdio: 'ignore', windowsHide: true }).unref();
}

/**
 * 윈도우를 다시 시작 (화면에서 확인을 받은 뒤 호출됨)
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function requestWindowsRestart({
    root = PROGRAM_ROOT,
    exists = (p) => fs.existsSync(p),
    restart = runRestart,
} = {}) {
    // 설치된 프로그램에서만 — 개발 PC(npm start)에서 눌러 개발 PC 가 꺼지는 일을 막음 (프로그램 종료와 같은 기준)
    if (!exists(path.join(root, 'Start-GaramLED.bat'))) {
        return { ok: false, error: '설치된 프로그램에서만 다시 시작할 수 있습니다.' };
    }
    restart();
    return { ok: true };
}

module.exports = { openWindowsSettings, settingsResultFromExit, requestWindowsRestart };
