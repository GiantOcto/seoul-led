const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 설정 화면 "프로그램 종료" — 서버(node)·자동 재시작 창·크롬 감시 창·키오스크 크롬을 한 번에 끔
// 감시 창이 살아 있으면 크롬·서버를 다시 켜 버리므로, 명령줄이나 실행 파일 경로에 프로그램 폴더가 들어간
// cmd·chrome·node 를 모두 끔 (설치 파일이 업데이트 전에 멈추는 방식과 같음)

const PROGRAM_ROOT = path.resolve(__dirname, '..');

/** 같은 PC(키오스크 크롬)에서 온 요청만 — 다른 PC에서 화면을 열어 둔 경우엔 못 끔 */
function isLocalRequest(req) {
    const addr = (req.socket && req.socket.remoteAddress) || '';
    return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function buildStopCommand(root) {
    // 끝에 \ 를 붙여 C:\GaramLED2 같은 다른 폴더는 제외. 서버 node 는 명령줄이 "node server.js" 뿐이라 실행 파일 경로로 찾음
    const pattern = `*${root.replace(/\\+$/, '')}\\*`.replace(/'/g, "''");
    return [
        'Start-Sleep -Milliseconds 500;',
        'Get-CimInstance Win32_Process | Where-Object {',
        "$_.Name -in @('cmd.exe','chrome.exe','node.exe') -and",
        `($_.CommandLine -like '${pattern}' -or $_.ExecutablePath -like '${pattern}')`,
        // 서버 node 는 맨 마지막 — node 가 꺼지면 이 PowerShell 도 같이 끝나므로 나머지를 먼저 끔
        "} | Sort-Object { if ($_.Name -eq 'node.exe') { 1 } else { 0 } }",
        '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }',
    ].join(' ');
}

function spawnStopPowerShell(command) {
    // detached 로 띄우면 콘솔 없는 PowerShell 이 명령을 실행하지 않고 끝나서 일반 실행 (응답을 먼저 보낸 뒤 0.5초 후 종료)
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
        stdio: 'ignore',
        windowsHide: true,
    }).unref();
}

/**
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function requestProgramShutdown({
    root = PROGRAM_ROOT,
    exists = (p) => fs.existsSync(p),
    spawnStop = spawnStopPowerShell,
} = {}) {
    // 설치된 프로그램에서만 — 개발 PC(npm start)에서 누르면 저장소 안 node 들까지 꺼지므로 막음
    if (!exists(path.join(root, 'Start-GaramLED.bat'))) {
        return { ok: false, error: '설치된 프로그램에서만 종료할 수 있습니다.' };
    }
    spawnStop(buildStopCommand(root));
    return { ok: true };
}

module.exports = { isLocalRequest, buildStopCommand, requestProgramShutdown };
