/**
 * client 에서 npm run build 시: React 빌드 후 Windows 면 release:win (--skip-client-build)
 * Mac/Linux 는 React 만 (무한 루프·실패 방지)
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

if (process.platform !== 'win32') {
    console.log('[build] Windows 아님 — release:win 스킵 (React 빌드만 완료)');
    process.exit(0);
}

execSync('npm run release:win -- --skip-client-build', {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
});
