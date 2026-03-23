# LED 실행 · 시리얼 설정

운영 스택은 **Node (`server.js`) 하나**가 **웹(React 빌드) + API + Socket.IO + 시리얼**을 같은 포트에서 제공한다. **`serve.exe`는 사용하지 않음.**

## 한 번에 웹 빌드 (프로젝트 루트)

```powershell
cd C:\경로\seoul-led
npm run build
```

→ `client/build` 생성. `server.js`가 `build/` 또는 `client/build/` 중 `index.html` 있는 쪽을 자동으로 서빙한다.

## Windows 릴리즈 (포터블 Node까지 한 폴더에)

**PC에 Node 설치 없이** 통째로 복사해 쓰려면 (Windows에서만):

```powershell
cd C:\경로\seoul-led
npm run release:win
```

**`client` 폴더에서 `npm run build`** 해도 동일하게 끝까지 감: React 빌드 → `dist\GaramLED` 릴리즈(포터블 Node 포함).  
(실행은 **`client` 루트**에서 — `client\src` 가 아님.)

- React만 빠르게: `cd client` 후 **`npm run build:web`**

- `client` 빌드 → 공식 **Node win-x64 zip** 다운로드(캐시: `.release-cache`) → `dist/GaramLED/` 에 `node/`, `server/`, `client/build/` 묶음  
- 현장에서는 `dist\GaramLED\Start-GaramLED.bat` 실행, `server\.env` 만 복사·수정  
- Node 버전 바꾸기: `set NODE_RELEASE_VERSION=22.14.0` 후 `npm run release:win`

## `server/.env`

`server/.env.example` 을 복사해 `server/.env` 로 두고 수정:

```env
SERIAL_PORT=COM3
BAUD_RATE=9600
PORT=8000
```

- **`SERIAL_PORT`**: 시리얼 사용 시 COM 포트
- **`BAUD_RATE`**: 기본 `9600`
- **`PORT`**: 웹+API **동일 포트** (기본 `8000`)

## 접속

- 브라우저: **`http://localhost:{PORT}`** (`server/.env` 의 `PORT`, 기본 `8000`)
- API: `http://localhost:{PORT}/api/status` 등

## 배치 / 실행

- **릴리즈 패키지**: `dist\GaramLED\Start-GaramLED.bat` — 포터블 Node로 `server.js` + Chrome 키오스크 (`server\.env` 의 `PORT`)
- **소스 트리에서**: `server` 폴더에서 `npm start` → 브라우저로 **`http://localhost:{PORT}`** (기본 8000)

## 개발 시

| 모드 | 방법 |
|------|------|
| **프론트 핫리로드** | `client`에서 `npm start` → `http://localhost:3000`, 소켓은 코드에서 `http://localhost:8000`으로 연결 (개발 중 server `PORT`를 8000이 아니게 쓰면 실행 시 `REACT_APP_SOCKET_URL`만 지정) |
| **운영과 동일(단일 포트)** | 루트 `npm run build` 후 `server`에서 `npm start` → `http://localhost:8000` |

`server` 폴더에서 `npm start` / `node server.js` — 콘솔에 `Server is running on port …` 확인.