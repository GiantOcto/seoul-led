# 설치할 때 한 번 실행 — 작업 스케줄러에 LED 프로그램용 관리자 권한 작업 셋을 등록 (관리자 권한 필요: 설치 파일이 관리자 권한으로 이 스크립트를 돌림)
#   GaramLED Boot Apps : 로그온할 때 한 번 — NovaLCT·ViPlex 켜기 + ViPlex 자리 잡기 (ledwin.exe boot)
#   GaramLED NovaLCT   : 헤더 "NovaLCT" 버튼이 눌릴 때 LED 서버가 실행 (ledwin.exe front-novalct)
#   GaramLED ViPlex    : 헤더 "ViPlex" 버튼이 눌릴 때 LED 서버가 실행 (ledwin.exe front-viplex)
# NovaLCT·ViPlex 는 켤 때 관리자 권한을 요구해서, 일반 권한인 LED 프로그램이 직접 켜면 매번 윈도우 확인 창이 뜸.
# 관리자 권한 작업으로 등록해 두면 같은 사용자는 확인 창 없이 그 작업을 돌릴 수 있음.
# 작업이 돌리는 ledwin.exe 는 창을 안 띄우는 실행 파일이라 바로 실행함 (파워셸을 거치면 켜지는 데만 몇 초가 걸려 버튼이 굼떴음)
#   -Remove   : 작업 셋을 지움 (프로그램 제거 때)
#   -RunLevel : 시험용 — Limited 로 주면 관리자 권한 없이도 등록됨 (실제 설치는 기본값 Highest)
param([switch]$Remove, [string]$RunLevel = 'Highest')
$ErrorActionPreference = 'Stop'   # 등록에 실패하면 거기서 멈춤 (실패했는데 등록됐다고 찍지 않게)

$tasks = @(
  @{ Name = 'GaramLED Boot Apps'; Command = 'boot';          AtLogOn = $true;  LimitMinutes = 20 },   # 한 번 도는 데 길면 13분 (LED 화면 3분 + ViPlex 창 5분 + NovaLCT 창 5분)
  @{ Name = 'GaramLED NovaLCT';   Command = 'front-novalct'; AtLogOn = $false; LimitMinutes = 10 },
  @{ Name = 'GaramLED ViPlex';    Command = 'front-viplex';  AtLogOn = $false; LimitMinutes = 10 }
)

if ($Remove) {
  $tasks | ForEach-Object { Unregister-ScheduledTask -TaskName $_.Name -Confirm:$false -ErrorAction SilentlyContinue }
  exit 0
}

$ledwin = Join-Path $PSScriptRoot 'ledwin.exe'
foreach ($t in $tasks) {
  $action = New-ScheduledTaskAction -Execute "`"$ledwin`"" -Argument $t.Command
  $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $t.LimitMinutes)
  $register = @{ TaskName = $t.Name; Action = $action; Settings = $settings; RunLevel = $RunLevel; Force = $true }
  if ($t.AtLogOn) {
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $trigger.Delay = 'PT5S'
    $register.Trigger = $trigger
  }
  Register-ScheduledTask @register | Out-Null
  Write-Host "Registered: $($t.Name)"
}
