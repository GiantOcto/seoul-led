const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// LED 프로그램이 도는 동안 LED 전용 프로필(chrome-profile)이 아닌 크롬은 바로 끔 — 실제 감시는 chrome-guard.ps1 이 상주하며 함
const PROGRAM_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(__dirname, 'chrome-guard.ps1');

/** 감시 PowerShell 을 띄움. 설치된 프로그램이 아니면(개발 PC) 띄우지 않고 null */
function startChromeGuard({
    root = PROGRAM_ROOT,
    exists = (p) => fs.existsSync(p),
    spawnFn = spawn,
    serverPid = process.pid,
} = {}) {
    // 개발 PC(npm start)에서 켜면 개발자가 쓰는 크롬까지 꺼 버리므로 설치된 프로그램에서만
    if (!exists(path.join(root, 'Start-GaramLED.bat'))) return null;

    const args = [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT,
        '-ServerPid', String(serverPid),
        '-ProfileDir', path.join(root, 'chrome-profile'),
    ];
    const child = spawnFn('powershell.exe', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    child.stdout.on('data', (chunk) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
            const killed = line.match(/^killed (\d+)/);
            if (killed) console.log(`[chrome-guard] LED 프로필이 아닌 크롬 종료 (pid ${killed[1]})`);
        }
    });
    child.on('exit', (code) => console.warn(`[chrome-guard] 감시 종료 (code ${code})`));
    console.log('[chrome-guard] LED 크롬 말고 다른 크롬은 끄는 감시 시작');
    return child;
}

module.exports = { startChromeGuard };
