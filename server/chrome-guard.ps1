# LED 프로그램이 도는 동안 LED 전용 프로필(chrome-profile)이 아닌 크롬은 바로 끔 — 다른 크롬 창이 LED 화면 자리를 덮지 않게
# 서버(node)가 넘긴 서버 PID 가 꺼지면 같이 끝남 → 프로그램 종료·업데이트 뒤엔 일반 크롬을 다시 쓸 수 있음
# 한 번 띄워 두고 안에서 10초마다 확인 (10초마다 PowerShell 을 새로 띄우면 느린 PC 에서 CPU·Defender 부담)
param([int]$ServerPid, [string]$ProfileDir)
$intervalSec = 10

while (Get-Process -Id $ServerPid -ErrorAction SilentlyContinue) {
  # 크롬 본체만 봄 (창·탭마다 뜨는 하위 프로세스는 --type= 이 붙음). 본체를 트리째 끄면 하위도 같이 꺼짐
  # 명령줄을 못 읽은 프로세스는 우리 것일 수도 있어서 건드리지 않음
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -notlike '*--type=*' -and $_.CommandLine -notlike "*$ProfileDir*" } |
    ForEach-Object {
      & taskkill.exe /F /T /PID $_.ProcessId 2>&1 | Out-Null
      "killed $($_.ProcessId)"   # 서버가 받아서 로그에 남김 (한글은 출력 인코딩이 깨져서 영문)
    }
  Start-Sleep $intervalSec
}
