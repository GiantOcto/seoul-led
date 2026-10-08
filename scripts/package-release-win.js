/**
 * Windows 릴리즈 패키지: 포터블 Node + server + client/build
 * 사용: npm run release:win
 * 이미 client/build 했으면: npm run release:win -- --skip-client-build
 * Node 버전 변경: set NODE_RELEASE_VERSION=22.14.0 && npm run release:win
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const NODE_VER = process.env.NODE_RELEASE_VERSION || '20.18.1';
const ZIP_NAME = `node-v${NODE_VER}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VER}/${ZIP_NAME}`;
const CACHE = path.join(ROOT, '.release-cache');
const OUT = path.join(ROOT, 'dist', 'GaramLED');
const INNER = `node-v${NODE_VER}-win-x64`;
const skipClientBuild = process.argv.includes('--skip-client-build');

function log(...a) {
    console.log('[release]', ...a);
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https
            .get(url, (res) => {
                if (res.statusCode === 302 || res.statusCode === 301) {
                    file.close();
                    fs.unlinkSync(dest);
                    return download(res.headers.location, dest).then(resolve).catch(reject);
                }
                if (res.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(dest);
                    return reject(new Error(`HTTP ${res.statusCode} ${url}`));
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            })
            .on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
    });
}

async function main() {
    if (process.platform !== 'win32') {
        console.error('release:win 은 Windows 에서만 실행하세요.');
        process.exit(1);
    }

    if (skipClientBuild) {
        log('1/5 client 빌드 스킵 (--skip-client-build)');
    } else {
        log('1/5 client 빌드 (npm run build:web)');
        execSync('npm run build:web', { cwd: ROOT, stdio: 'inherit' });
    }

    const clientBuild = path.join(ROOT, 'client', 'build', 'index.html');
    if (!fs.existsSync(clientBuild)) {
        console.error('client/build/index.html 없음 — client 에서 npm install 후 다시 시도');
        process.exit(1);
    }

    fs.mkdirSync(CACHE, { recursive: true });
    const zipPath = path.join(CACHE, ZIP_NAME);
    if (!fs.existsSync(zipPath)) {
        log(`2/5 Node 다운로드 ${NODE_URL}`);
        await download(NODE_URL, zipPath);
    } else {
        log(`2/5 Node 캐시 사용 ${zipPath}`);
    }

    runRest();
}

function runRest() {
    const zipPath = path.join(CACHE, ZIP_NAME);
    const extractRoot = path.join(CACHE, `extract-${NODE_VER}`);
    const nodeSrc = path.join(extractRoot, INNER);

    if (!fs.existsSync(path.join(nodeSrc, 'node.exe'))) {
        log('3/5 Node zip 압축 해제');
        fs.rmSync(extractRoot, { recursive: true, force: true });
        fs.mkdirSync(extractRoot, { recursive: true });
        execSync(
            `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractRoot.replace(/'/g, "''")}' -Force"`,
            { stdio: 'inherit' }
        );
    } else {
        log('3/5 Node 압축 해제 캐시 사용');
    }

    if (!fs.existsSync(path.join(nodeSrc, 'node.exe'))) {
        console.error(`예상 경로에 node.exe 없음: ${nodeSrc}`);
        process.exit(1);
    }

    log('4/5 dist/GaramLED 구성');
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT, 'client'), { recursive: true });

    fs.cpSync(nodeSrc, path.join(OUT, 'node'), { recursive: true });
    fs.cpSync(path.join(ROOT, 'client', 'build'), path.join(OUT, 'client', 'build'), { recursive: true });

    fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
    const serverSrc = path.join(ROOT, 'server');
    for (const name of fs.readdirSync(serverSrc)) {
        // server/.env(PORT·기상청 키)도 같이 넣어 현장 PC에서 따로 입력하지 않게 함 (.env 는 git 에는 안 올라감)
        if (name === 'node_modules') continue;
        if (name === 'server.exe' || name === 'serve.exe') continue;
        fs.cpSync(path.join(serverSrc, name), path.join(OUT, 'server', name), {
            recursive: true,
        });
    }

    const nodeDir = path.join(OUT, 'node');
    const pathSep = ';';
    const env = {
        ...process.env,
        PATH: `${nodeDir}${pathSep}${process.env.PATH || ''}`,
    };

    log('5/5 server 의존성 설치 (npm ci --omit=dev)');
    execSync('npm ci --omit=dev', {
        cwd: path.join(OUT, 'server'),
        env,
        stdio: 'inherit',
        shell: true,
    });

    const startBat = path.join(OUT, 'Start-GaramLED.bat');
    fs.writeFileSync(
        startBat,
        [
            '@echo off',
            'chcp 65001 > nul',
            'cd /d "%~dp0"',
            'set "PATH=%~dp0node;%PATH%"',
            'set "GARAM_PORT=8000"',
            'if exist "%~dp0server\\.env" (',
            '  for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0server\\.env") do (',
            '    if /i "%%a"=="PORT" set "GARAM_PORT=%%b"',
            '  )',
            ')',
            'set "GARAM_URL=http://localhost:%GARAM_PORT%"',
            'echo Node:',
            'node -v',
            'echo.',
            // 화면 출력은 영문 — chcp 65001 콘솔에서 한글 echo 가 겹쳐 보이는 표시 버그 회피
            'echo Web+API: %GARAM_URL%  (PORT in server\\.env)',
            'echo [1/2] Starting server (auto restart 5s after exit)...',
            // 무한 루프: node 가 어떤 이유로든 끝나면 다시 실행. 서버 창을 닫으면 루프도 함께 종료
            'start "GaramLED Server" /min cmd /c "cd /d %~dp0server && for /l %%i in (0,0,1) do (node server.js & echo Server stopped - restarting in 5s & timeout /t 5 /nobreak > nul)"',
            // 고정 대기 대신 서버 응답까지 대기 (부팅 직후 크롬이 먼저 떠서 빈 화면으로 멈추는 문제)
            'echo Waiting for server (max 90s)...',
            'powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(90); while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -Uri \'http://127.0.0.1:%GARAM_PORT%/api/status\' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } } catch {}; Start-Sleep -Seconds 1 }"',
            'echo [2/2] Starting Chrome kiosk (relaunch within 10s if closed)...',
            'echo This window watches Chrome. Close this window first before closing Chrome for maintenance.',
            // 이 프로필(chrome-profile)로 뜬 Chrome 이 없으면 다시 실행 (10초 간격 확인)
            ':chrome_watch',
            'powershell -NoProfile -Command "if (Get-CimInstance Win32_Process | Where-Object { $_.Name -eq \'chrome.exe\' -and $_.CommandLine -like \'*%~dp0chrome-profile*\' }) { exit 1 }"',
            'if errorlevel 1 goto chrome_wait',
            'echo [%date% %time%] Chrome started',
            'start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ^',
            '    --kiosk ^',
            '    --start-fullscreen ^',
            '    --user-data-dir="%~dp0chrome-profile" ^',
            '    --remote-debugging-port=9222 ^',
            '    --force-device-scale-factor=1 ^',
            '    --disable-features=TranslateUI ^',
            '    --disable-extensions ^',
            '    --disable-infobars ^',
            '    --disable-session-crashed-bubble ^',
            '    --disable-restore-session-state ^',
            '    --no-first-run ^',
            '    --disable-web-security ^',
            '    --disable-background-timer-throttling ^',
            '    --force-dark-mode ^',
            '    --enable-features=WebUIDarkMode ^',
            '    "%GARAM_URL%"',
            ':chrome_wait',
            'timeout /t 10 /nobreak > nul',
            'goto chrome_watch',
            '',
        ].join('\r\n'),
        'utf8'
    );

    const readme = path.join(OUT, 'README-릴리즈.txt');
    fs.writeFileSync(
        readme,
        [
            'Garam LED — Windows 릴리즈 (포터블 Node 포함)',
            '',
            '1. server/.env 에 빌드한 PC 설정(PORT·기상청 날씨 키)이 들어 있음. 없으면 .env.example 을 .env 로 복사 후 입력',
            '2. Start-GaramLED.bat 실행',
            '3. 브라우저: server/.env 의 PORT (기본 8000) — Start-GaramLED.bat 이 자동 반영',
            '',
            '키오스크: Chrome이 위 PORT의 http://localhost:PORT 로 열림 (서버 응답 확인 후, 최대 90초 대기)',
            '서버 로그: logs\\server\\server_날짜.log (콘솔 출력·종료 사유)',
            '',
            '자동 재시작:',
            '- 서버(node)가 비정상 종료되면 5초 후 다시 실행 ("GaramLED Server" 창을 닫으면 멈춤)',
            '- Chrome 이 꺼지면 10초 안에 다시 실행 (Start-GaramLED.bat 창이 감시 — 점검 시 이 창을 먼저 닫기)',
            '',
        ].join('\r\n'),
        'utf8'
    );

    log(`완료: ${OUT}`);
    log('실행: dist\\GaramLED\\Start-GaramLED.bat');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});