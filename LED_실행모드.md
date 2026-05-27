# LED 실행 · 수위(시리얼) 설정

운영 스택:

| 구성 | 역할 |
|------|------|
| **app.exe** (Python) | COM 포트 수위 읽기 → `serial_data` (실행 시 **트레이만** 표시, LED 화면 가리지 않음) |
| **Node (`server.js`)** | 웹(React 빌드) + API + Socket.IO (COM 직접 읽기 **없음**) |
| **Chrome** | 키오스크 UI (`http://localhost:8000`) |

`serve.exe` / 포트 3000 별도 웹서버는 **사용하지 않음.**

## 한 번에 웹 빌드 (프로젝트 루트)

```powershell
cd C:\경로\seoul-led
npm run build
```

→ `client/build` 생성. `server.js`가 `build/` 또는 `client/build/` 중 `index.html` 있는 쪽을 자동 서빙.

## Windows 릴리즈 (포터블 Node까지 한 폴더에)

```powershell
cd C:\경로\seoul-led
npm run release:win
```

- `dist/GaramLED/` — `node/`, `server/`, `client/build/`, `Start-GaramLED.bat`
- `app.exe`가 빌드되어 있으면 자동 포함 (없으면 수동 복사)
- 현장: `Start-GaramLED.bat` → **app.exe → Node → Chrome**

## `server/.env`

```env
PORT=8000
RELAY_EVENT_UDP_PORT=19031
```

- **`PORT`**: 웹+API 동일 포트 (기본 `8000`)
- **COM 포트**: 트레이 아이콘 → **설정 창 열기** (더블클릭)에서 설정

**app.exe 재빌드:** `python\build-app.bat` 실행 (PyInstaller 필요)

## 수위 데이터 흐름

```
COM 포트 → app.exe → serial_data → server.js → initial_data / new_data → WaterLevel.js (+250 보정)
```

## 접속

- 브라우저: **`http://localhost:{PORT}`** (기본 `8000`)
- API: `http://localhost:{PORT}/api/status` — `waterSource: python-app.exe` 확인

## 배치 (`가람LED실행파일.bat`)

개발/현장용: **app.exe → Node server → Chrome(8000)** 순서.

## 개발 시

| 모드 | 방법 |
|------|------|
| **프론트 핫리로드** | `client`에서 `npm start` → `http://localhost:3000`, 소켓은 `http://localhost:8000` |
| **운영과 동일** | `app.exe` 실행 + `server`에서 `npm start` → `http://localhost:8000` |
