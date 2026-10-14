const path = require('path');

// 로그 기본 위치 — 프로그램 폴더(GaramLED) 밖, 같은 드라이브 루트의 GaramLED-logs (보통 C:\GaramLED-logs)
// 업데이트하면서 프로그램 폴더를 통째로 지우고 새로 깔아도 로그가 남도록. 로그별 위치는 각 *_LOG_DIR env 로 변경 가능
const LOG_ROOT = path.join(path.parse(__dirname).root, 'GaramLED-logs');

module.exports = { LOG_ROOT };
