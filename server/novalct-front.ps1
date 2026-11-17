# 헤더 "NovaLCT" 버튼 — NovaLCT 가 켜져 있으면 창을 맨 앞으로, 꺼져 있으면 실행해서 창이 뜨면 맨 앞으로
# 끝 코드: 0 성공 / 2 NovaLCT 설치 안 됨 / 3 시간 안에 창이 안 뜸 (서버 novalct.js 가 로그 메시지로 바꿈)
. "$PSScriptRoot\window-tools.ps1"

$exeCandidates = @(
  "$env:APPDATA\Nova Star\NovaLCT\Bin\NovaLCT.exe",              # V5.9 부터 사용자별 설치
  "${env:ProgramFiles(x86)}\Nova Star\NovaLCT\Bin\NovaLCT.exe"    # 예전 버전
)
$waitSec = 300  # 사무실 PC 는 9초면 뜨지만 느린 현장 PC 는 로딩 화면에서 1분 넘게 걸림

# 켜지는 중엔 제목 없는 창이 잠깐 메인 창처럼 잡혀서 제목이 있는 창만 (로딩 화면은 메인 창으로 안 잡힘)
function Find-NovaWindow {
  Get-Process NovaLCT -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } | Select-Object -First 1
}

$p = Find-NovaWindow
if (-not $p) {
  # 프로세스는 있는데 창이 아직이면(켜지는 중) 또 실행하지 않고 기다리기만
  if (-not (Get-Process NovaLCT -ErrorAction SilentlyContinue)) {
    $exe = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $exe) { exit 2 }
    Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe)
  }
  for ($i = 0; $i -lt $waitSec -and -not $p; $i++) { Start-Sleep 1; $p = Find-NovaWindow }
  if (-not $p) { exit 3 }
}
[LedWin]::ForceForeground($p.MainWindowHandle) | Out-Null
exit 0
