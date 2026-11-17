# 헤더 "윈도우 설정" 버튼 — 윈도우 설정 창을 열어 LED 화면을 안 가리는 가운데 자리에 작게 놓고 맨 앞으로
# 끝 코드: 0 성공 / 3 시간 안에 창이 안 뜸 (서버 windows-control.js 가 로그 메시지로 바꿈)
. "$PSScriptRoot\window-tools.ps1"

$x = 300; $y = 183; $width = 760; $height = 560   # LED 화면(왼쪽 x<180) 옆 가운데 자리 — LED·오른쪽 프로그램을 안 가림 (y 는 LED 위쪽 끝과 같게)
$waitSec = 30

Start-Process 'ms-settings:'
$hwnd = [IntPtr]::Zero
for ($i = 0; $i -lt $waitSec * 2 -and $hwnd -eq [IntPtr]::Zero; $i++) {
  Start-Sleep -Milliseconds 500
  $hwnd = [LedWin]::FindSettingsWindow()
}
if ($hwnd -eq [IntPtr]::Zero) { exit 3 }

[LedWin]::Place($hwnd, $x, $y, $width, $height)
[LedWin]::ForceForeground($hwnd) | Out-Null
exit 0
