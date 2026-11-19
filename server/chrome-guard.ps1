# LED 프로그램이 도는 동안 크롬을 지켜봄 — 서버(node)가 띄워 두면 안에서 계속 확인
#  1) LED 전용 프로필(chrome-profile)이 아닌 크롬은 바로 끔 — 다른 크롬 창이 LED 화면 자리를 덮지 않게
#  2) LED 크롬 창 위에 작업표시줄이 계속 보이게 표시를 붙임 — 크롬이 다시 켜져 창이 새로 생기면 그때 또 붙임
# 서버(node)가 넘긴 서버 PID 가 꺼지면 같이 끝남 → 프로그램 종료·업데이트 뒤엔 일반 크롬을 다시 쓸 수 있음
# 한 번 띄워 두고 안에서 확인 (확인할 때마다 PowerShell 을 새로 띄우면 느린 PC 에서 CPU·Defender 부담)
# 확인 간격: 평소 10초. LED 크롬 창에 작업표시줄 표시가 아직 없으면(막 켜졌거나 다시 켜지는 중) 1초
#  — 10초로만 돌았더니 첫 화면이 뜨고 9초쯤 작업표시줄이 안 보였음 (2026-11-18 확인)
param([int]$ServerPid, [string]$ProfileDir)
. "$PSScriptRoot\window-tools.ps1"
$slowSec = 10
$fastSec = 1

while (Get-Process -Id $ServerPid -ErrorAction SilentlyContinue) {
  $isLedWindowMarked = $false
  # 크롬이 하나도 없으면 아래 명령줄 조회(무거움)는 건너뜀 — 크롬을 꺼 둔 동안 1초마다 돌아도 부담 없게
  if (Get-Process -Name chrome -ErrorAction SilentlyContinue) {
    # 크롬 본체만 봄 (창·탭마다 뜨는 하위 프로세스는 --type= 이 붙음). 본체를 트리째 끄면 하위도 같이 꺼짐
    # 명령줄을 못 읽은 프로세스는 우리 것일 수도 있어서 건드리지 않음
    $browsers = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine -notlike '*--type=*' })

    foreach ($chrome in $browsers) {
      if ($chrome.CommandLine -notlike "*$ProfileDir*") {
        & taskkill.exe /F /T /PID $chrome.ProcessId 2>&1 | Out-Null
        "killed $($chrome.ProcessId)"   # 서버가 받아서 로그에 남김 (한글은 출력 인코딩이 깨져서 영문)
        continue
      }
      # LED 크롬 — 창이 떠 있으면 작업표시줄 표시를 붙임 (이미 붙어 있으면 아무 일도 안 함)
      $window = (Get-Process -Id $chrome.ProcessId -ErrorAction SilentlyContinue).MainWindowHandle
      if ($window -and $window -ne [IntPtr]::Zero) {
        if ([LedWin]::KeepTaskbarVisibleOver($window)) { "taskbar $($chrome.ProcessId)" }
        $isLedWindowMarked = $true
      }
    }
  }
  Start-Sleep $(if ($isLedWindowMarked) { $slowSec } else { $fastSec })
}
