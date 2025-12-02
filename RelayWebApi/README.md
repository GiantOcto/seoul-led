# RelayWebApi 프로젝트 구조 설명

## 📋 개요

RelayWebApi는 **센서 데이터 수집 및 릴레이 제어**를 위한 ASP.NET Core 8.0 Web API 프로젝트입니다.

- **.NET 8.0** 기반
- **HTTP API** 서버
- **시리얼 통신** (COM 포트)으로 센서 데이터 수집
- **HTTP 통신**으로 릴레이 제어
- **백그라운드 서비스**로 자동 센서 모니터링 및 릴레이 제어

---

## 📁 프로젝트 구조

```
RelayWebApi/
├── Controllers/          # API 엔드포인트
│   ├── RelayApiController.cs    # 릴레이 제어 API
│   ├── SensorApiController.cs   # 센서 데이터 조회 API
│   └── RelayController.cs       # 릴레이 보드 제어 로직
├── Services/            # 비즈니스 로직 서비스
│   ├── SensorDataService.cs          # 센서 데이터 저장소 (Singleton)
│   └── SensorBackgroundService.cs    # 백그라운드 센서 모니터링 서비스
├── Sensors/             # 센서 통신 클래스
│   ├── SentrionSensor.cs    # Sentrion 온습도 센서
│   └── ECSensors.cs         # EC Sense 가스/온습도 센서
├── Program.cs           # 애플리케이션 진입점 및 설정
└── Properties/
    └── launchSettings.json  # 실행 설정 (포트, 환경변수 등)
```

---

## 🔧 주요 구성 요소

### 1. **Program.cs** - 애플리케이션 설정

```csharp
- 서비스 등록 (DI 컨테이너)
- CORS 설정 (React 프론트엔드 연동)
- Swagger UI 설정 (개발 환경)
- 미들웨어 파이프라인 구성
```

**주요 기능:**
- `SensorDataService` (Singleton) 등록
- `SensorBackgroundService` (HostedService) 등록
- CORS 정책: `http://localhost:5173` 허용
- Swagger UI: 개발 환경에서 `/swagger` 접근 가능
- 포트: `http://localhost:5130`

---

### 2. **Controllers/** - API 엔드포인트

#### **RelayApiController.cs**
릴레이 제어를 위한 REST API

**엔드포인트:**
- `POST /api/RelayApi/on/{relayNumber}` - 릴레이 켜기
- `POST /api/RelayApi/off/{relayNumber}` - 릴레이 끄기

**릴레이 번호:**
- `0` = 1번 릴레이
- `1` = 2번 릴레이
- `2` = 3번 릴레이
- `3` = 4번 릴레이

#### **SensorApiController.cs**
센서 데이터 조회 API

**엔드포인트:**
- `GET /api/SensorApi/data` - 최신 센서 데이터 조회

**응답 데이터:**
```json
{
  "sentrionTemp": 25.5,        // Sentrion 온도 (°C)
  "sentrionHumidity": 60.0,    // Sentrion 습도 (%)
  "ecTemp": 20.0,              // EC 함내온도 (°C)
  "ecHumidity": 45.0,          // EC 함내습도 (%)
  "h2s": 0.001,                // H2S 가스 농도 (ppm)
  "relay3Status": false,       // 릴레이 3번 상태 (함내습도 제어용)
  "relay4Status": false,       // 릴레이 4번 상태 (H2S 제어용)
  "lastUpdated": "2024-01-01T12:00:00"
}
```

#### **RelayController.cs** (비API 컨트롤러)
딩티안 릴레이 보드 HTTP 제어 로직

**기능:**
- HTTP GET으로 릴레이 보드 제어
- IP 주소: `192.168.0.100` (기본값)
- 프로토콜: HTTP GET CGI 방식
- URL: `http://{IP}/relay_cgi.cgi?type=0&relay={번호}&on={0|1}&time=0&pwd=0`

**메서드:**
- `TurnOnAsync(int relayNumber)` - 릴레이 켜기
- `TurnOffAsync(int relayNumber)` - 릴레이 끄기

---

### 3. **Services/** - 비즈니스 로직

#### **SensorDataService.cs**
센서 데이터 저장소 (Singleton)

**역할:**
- 최신 센서 데이터를 메모리에 저장
- 여러 컨트롤러/서비스에서 공유 데이터 접근

**데이터 속성:**
- `SentrionTemp`, `SentrionHumidity` - Sentrion 센서 데이터
- `EcTemp`, `EcHumidity`, `H2S` - EC 센서 데이터
- `Relay3Status`, `Relay4Status` - 릴레이 상태
- `LastUpdated` - 마지막 업데이트 시간

#### **SensorBackgroundService.cs**
백그라운드 센서 모니터링 서비스 (HostedService)

**역할:**
- 서버 시작 시 자동 실행
- 2초마다 센서 데이터 읽기
- 자동 릴레이 제어 (조건부)

**동작 흐름:**
1. **초기화** (서버 시작 시)
   - Sentrion 센서 연결 (COM9)
   - EC 센서 연결 (COM10)
   - 릴레이 컨트롤러 초기화 (192.168.0.100)

2. **반복 작업** (2초마다)
   - 센서 데이터 읽기
   - `SensorDataService`에 데이터 저장
   - 릴레이 자동 제어:
     - **릴레이 4번 (H2S)**: H2S >= 0.001ppm → ON
     - **릴레이 3번 (습도)**: 함내습도 >= 50% → ON
   - 로그 출력

---

### 4. **Sensors/** - 센서 통신

#### **SentrionSensor.cs**
Sentrion 온습도 센서 통신 클래스

**통신 설정:**
- 통신 방식: 시리얼 (RS-485/Modbus)
- 포트: COM9
- 속도: 9600 baud
- 주소: 0x01

**기능:**
- `Connect(string portName)` - 포트 연결
- `ReadData()` - 온도, 습도 읽기
  - 반환값: `(humidity, temperature)`
- `Dispose()` - 리소스 해제

#### **ECSensors.cs**
EC Sense 가스/온습도 센서 통신 클래스

**통신 설정:**
- 통신 방식: 시리얼 (UART)
- 포트: COM10
- 속도: 9600 baud

**기능:**
- `Connect(string portName)` - 포트 연결
- `ReadData()` - H2S 가스, 함내온도, 함내습도 읽기
  - 반환값: `(h2s, humidity, temperature)`
  - 2단계 통신:
    1. 가스 농도 읽기 (Command 0x86)
    2. 온습도 읽기 (Command 0x87)
- `Dispose()` - 리소스 해제

---

## 🔄 데이터 흐름

```
┌─────────────────┐
│  SentrionSensor │ (COM9)
│  ECSensor       │ (COM10)
└────────┬────────┘
         │ 2초마다 읽기
         ▼
┌─────────────────────────────┐
│ SensorBackgroundService     │
│ - 센서 데이터 수집          │
│ - 릴레이 자동 제어          │
└────────┬────────────────────┘
         │ 데이터 저장
         ▼
┌─────────────────────────────┐
│ SensorDataService           │
│ (Singleton - 메모리 저장)   │
└────────┬────────────────────┘
         │ 데이터 조회
         ▼
┌─────────────────────────────┐
│ SensorApiController         │
│ GET /api/SensorApi/data     │
└─────────────────────────────┘

┌─────────────────────────────┐
│ RelayApiController          │
│ POST /api/RelayApi/on|off   │
└────────┬────────────────────┘
         │ 제어 명령
         ▼
┌─────────────────────────────┐
│ RelayController             │
│ HTTP GET → 릴레이 보드      │
└─────────────────────────────┘
```

---

## 📡 API 사용 예시

### 릴레이 제어

**켜기:**
```http
POST http://localhost:5130/api/RelayApi/on/0
Content-Type: application/json
```

**끄기:**
```http
POST http://localhost:5130/api/RelayApi/off/0
Content-Type: application/json
```

### 센서 데이터 조회

```http
GET http://localhost:5130/api/SensorApi/data
```

**응답:**
```json
{
  "sentrionTemp": 25.5,
  "sentrionHumidity": 60.0,
  "ecTemp": 20.0,
  "ecHumidity": 45.0,
  "h2s": 0.001,
  "relay3Status": false,
  "relay4Status": false,
  "lastUpdated": "2024-01-01T12:00:00"
}
```

---

## ⚙️ 설정

### 포트 설정
- **API 서버**: `http://localhost:5130`
- **Sentrion 센서**: COM9
- **EC 센서**: COM10
- **릴레이 보드**: `192.168.0.100`

### 릴레이 자동 제어 조건
- **릴레이 3번** (함내습도): EC 함내습도 >= 50% → ON
- **릴레이 4번** (H2S): H2S >= 0.001ppm → ON

---

## 🚀 실행 방법

```bash
cd RelayWebApi
dotnet run
```

**Swagger UI:**
브라우저에서 `http://localhost:5130/swagger` 접속

---

## 📦 의존성

- **Swashbuckle.AspNetCore** (6.4.0) - Swagger UI
- **System.IO.Ports** (10.0.0) - 시리얼 통신

---

## 🔍 주요 특징

1. **실시간 센서 모니터링**: 백그라운드 서비스로 2초마다 자동 수집
2. **자동 릴레이 제어**: 센서 값 기준으로 자동 ON/OFF
3. **RESTful API**: 표준 HTTP API로 외부 시스템 연동 가능
4. **Swagger 지원**: 개발 환경에서 API 테스트 가능
5. **CORS 지원**: React 프론트엔드와 연동 가능

---

## 📝 참고사항

- 센서가 연결되지 않으면 서버 시작 시 에러 발생 가능
- 릴레이 보드 IP 주소는 하드코딩되어 있음 (필요시 설정 파일로 분리 권장)
- COM 포트는 하드코딩되어 있음 (필요시 설정 파일로 분리 권장)

