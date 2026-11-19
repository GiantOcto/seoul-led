/**
 * server/ledwin 의 C# 소스를 ledwin.exe 로 빌드 (헤더 버튼·부팅 작업이 쓰는 창 다루기 실행 파일)
 * 윈도우에 기본으로 들어 있는 .NET Framework 컴파일러(csc)를 써서 따로 설치할 게 없음
 * 사용: node scripts/build-ledwin.js [결과 파일]   (기본: server/ledwin.exe — 개발 PC 에서 버튼을 눌러 볼 때)
 * 설치 파일을 만들 땐 package-release-win.js 가 dist 안에 바로 빌드함
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'server', 'ledwin');
const WINDIR = process.env.WINDIR || 'C:\\Windows';
const COMPILERS = [
    path.join(WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(WINDIR, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
];

/** @param {string} outFile 만들 ledwin.exe 경로 */
function buildLedwin(outFile = path.join(ROOT, 'server', 'ledwin.exe')) {
    const compiler = COMPILERS.find((p) => fs.existsSync(p));
    if (!compiler) throw new Error(`C# 컴파일러(csc.exe)를 못 찾음: ${COMPILERS.join(', ')}`);
    const sources = fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.cs')).map((name) => path.join(SOURCE_DIR, name));
    execFileSync(compiler, [
        '/nologo',
        '/target:winexe', // 창(콘솔)을 안 띄우는 프로그램 — 버튼을 눌러도 검은 창이 번쩍이지 않게
        '/optimize+',
        '/codepage:65001', // 소스가 UTF-8 (한글 창 제목 "설정" 을 그대로 씀)
        '/reference:Microsoft.CSharp.dll', // 작업 스케줄러를 dynamic 으로 부름
        `/out:${outFile}`,
        ...sources,
    ], { stdio: 'inherit' });
    return outFile;
}

if (require.main === module) {
    console.log('[ledwin] 빌드:', buildLedwin(process.argv[2]));
}

module.exports = { buildLedwin };
