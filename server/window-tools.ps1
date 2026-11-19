# 창 다루는 공용 코드(LedWin)를 파워셸로 불러옴 — chrome-guard.ps1 이 씀 (. "$PSScriptRoot\window-tools.ps1")
# 코드 자체는 ledwin\LedWin.cs 한 곳에만 있음 (ledwin.exe 와 같이 씀)
#  - 설치본: 같은 폴더의 ledwin.exe 안에 빌드돼 들어 있는 걸 불러옴 (컴파일 안 함)
#    파일을 잡고 있지 않게 내용만 읽어서 올림 — 감시가 돌고 있어도 설치 파일이 ledwin.exe 를 바꿀 수 있어야 함
#  - 개발 PC (ledwin.exe 를 아직 안 만든 경우): LedWin.cs 를 그 자리에서 컴파일
$ledwinExe = Join-Path $PSScriptRoot 'ledwin.exe'
if (Test-Path $ledwinExe) {
  [Reflection.Assembly]::Load([IO.File]::ReadAllBytes($ledwinExe)) | Out-Null
} else {
  Add-Type -Path (Join-Path $PSScriptRoot 'ledwin\LedWin.cs')
}
