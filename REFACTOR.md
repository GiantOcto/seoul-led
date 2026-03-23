# 리팩토링 현황

## 완료

| 항목 | 내용 |
|------|------|
| Python 제거 | `python/` 폴더 삭제. 시리얼 읽기를 Node가 직접 담당 |
| 불필요한 파일 삭제 | `가람LED실행파일.bat`, `serve.exe`, `server/server.exe`, `server/serve.exe` |
| `serial_data` 소켓 이벤트 제거 | Python이 push하던 이벤트 — Python 없으니 삭제 |
| `DataStore.addData` 정렬 제거 | 시리얼 데이터는 시간순 보장 → `push`만으로 충분 |
| 자동 재연결 | 포트 오류/끊김 시 5초마다 재시도 (`scheduleSerialRetry`) |
| 개발용 테스트 엔드포인트 | `POST /api/test/inject` — 하드웨어 없이 데이터 주입 테스트 |
| 배포 단일화 | `npm run release:win` → `dist/GaramLED/Start-GaramLED.bat` |

---

## 실행 방법

```bash
# 개발
cd server && node server.js

# 빌드 + 배포 패키지 생성 (루트에서)
npm run build:web
npm run release:win
# → dist/GaramLED/Start-GaramLED.bat
```

```env
# server/.env
PORT=8000
SERIAL_PORT=COM3
BAUD_RATE=9600
```
