const path = require('path');
const { execFile } = require('child_process');

// 다른 프로그램 창을 다루는 실행 파일 (server/ledwin 의 C# 소스를 빌드한 것 — 명령 목록은 ledwin/Program.cs 맨 위)
// 설치본엔 들어 있고, 개발 PC 에서 버튼을 눌러 보려면 node scripts/build-ledwin.js 로 만듦
// 예전엔 버튼마다 파워셸 스크립트를 돌렸는데 켜지는 데만 몇 초가 걸려서 이걸로 바꿈 (2026-11-18)
const LEDWIN = path.join(__dirname, 'ledwin.exe');
const NO_TASK_EXIT_CODE = 100; // ledwin run-task: 작업이 등록 안 됨 (개발 PC, 예전 설치본)
const START_MARGIN_MS = 15 * 1000; // 기다리는 시간에 얹는 여유

/** ledwin.exe 를 돌림 — 성공이면 null, 아니면 execFile 오류 (code 는 ledwin 의 끝 코드) */
function runLedwin(args, waitSec, exec = execFile) {
    return new Promise((resolve) => {
        exec(LEDWIN, args, { windowsHide: true, timeout: waitSec * 1000 + START_MARGIN_MS }, (err) => resolve(err || null));
    });
}

/**
 * 설치할 때 등록해 둔 관리자 권한 작업(register-tasks.ps1)으로 돌림. 작업이 없으면 같은 명령을 직접 실행
 * — NovaLCT·ViPlex 는 켤 때 관리자 권한을 요구해서, 일반 권한인 서버가 직접 켜면 윈도우 확인 창이 뜸
 * @param {{ taskName: string, args: string[], waitSec: number }} job  args 는 그 작업이 돌리는 것과 같은 ledwin 명령
 * @returns {Promise<null | { code?: number, message: string }>}
 */
async function runAsAdminTask(job, exec = execFile) {
    const viaTask = await runLedwin(['run-task', job.taskName, '--timeout', String(job.waitSec + 10)], job.waitSec + 10, exec);
    if (!viaTask || viaTask.code !== NO_TASK_EXIT_CODE) return viaTask;
    return runLedwin(job.args, job.waitSec, exec);
}

module.exports = { runLedwin, runAsAdminTask, LEDWIN, NO_TASK_EXIT_CODE };
