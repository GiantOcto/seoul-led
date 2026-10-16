const path = require('path');

// 로그 기본 위치 — 프로그램 폴더 안 logs (설치 위치가 C:\GaramLED 면 C:\GaramLED\logs)
// 실행 중에 생긴 파일이라 설치 파일로 업데이트·제거해도 남음. 로그별 위치는 각 *_LOG_DIR env 로 변경 가능
const LOG_ROOT = path.join(__dirname, '..', 'logs');

module.exports = { LOG_ROOT };
