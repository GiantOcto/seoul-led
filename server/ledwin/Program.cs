// ledwin.exe — 헤더 버튼·부팅 작업이 시키는 "다른 프로그램 창 다루기"를 하는 작은 실행 파일
// 예전엔 버튼마다 파워셸 스크립트를 돌렸는데, 파워셸은 켜지는 데만 몇 초가 걸려 버튼이 굼떴음 (현장 PC 는 더 느림).
// 이 파일은 바로 켜져서 거의 누르자마자 창이 올라옴. 화면에 창을 안 띄우는 프로그램으로 빌드함 (scripts/build-ledwin.js)
//
// 명령 (끝 코드는 아래 Exit 참고 — 서버가 로그 메시지로 바꿈):
//   front-novalct [--start-only]   NovaLCT 를 켜고(꺼져 있을 때만) 창을 맨 앞으로. 자리는 NovaLCT 가 스스로 잡으므로 안 건드림
//   front-viplex  [--start-only]   ViPlex 를 켜고(꺼져 있을 때만) 창을 제자리에 놓아 맨 앞으로
//                                  --start-only 는 켜기만 하고 바로 끝 (부팅 때 먼저 켜 두는 용도)
//   settings                       윈도우 설정 창을 LED 를 안 가리는 자리에 작게 띄움
//   restart --process <이름> --exe-list <a|b> [--splash-title <제목>] [--wait 초] [--close-wait 초]
//                                  켜져 있으면 창 닫기로 끄고 다시 켬, 꺼져 있으면 켬. 본 창이 뜰 때까지 기다림 (Relay 리셋)
//   boot                           부팅 때 한 번: NovaLCT·ViPlex 를 켜 두고, LED 화면이 뜨면 ViPlex 를 놓아 올린 뒤 그 위에 NovaLCT
//   run-task <작업 이름> [--timeout 초]
//                                  관리자 권한으로 등록해 둔 작업을 돌리고 끝나길 기다려 그 끝 코드를 돌려줌 (작업이 없으면 100)
//   front --process <이름> --exe-list <a|b> [--require-title] [--place x,y,가로,세로] [--start-only] [--wait 초]
//                                  위 front-* 가 쓰는 공통 동작 — 다른 프로그램으로 시험할 때 직접 부름
//
// NovaLCT·ViPlex 는 켤 때 관리자 권한을 요구함. 일반 권한으로 front-* 를 돌리면 켤 때 윈도우 확인 창이 뜨고,
// 관리자 권한으로 뜬 창은 옮길 수도 없음(앞으로 올리기만 됨). 그래서 설치할 때 관리자 권한 작업으로 등록해 두고
// (register-tasks.ps1) LED 서버는 run-task 로 그 작업을 돌림
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading;

static class Exit {
  public const int Ok = 0;
  public const int Failed = 1;          // 예상 못 한 오류
  public const int NotInstalled = 2;    // 실행 파일이 없음
  public const int NoWindow = 3;        // 시간 안에 창이 안 뜸
  public const int WouldNotClose = 4;   // 꺼지지 않아 다시 켜지 못함
  public const int Usage = 64;          // 명령을 잘못 줌
  public const int NoTask = 100;        // run-task: 작업이 등록 안 됨 (부른 쪽이 직접 실행)
}

// 켜고 올릴 프로그램 하나
class App {
  public string Process;         // 프로세스 이름 (.exe 뺀 것)
  public string[] ExeList;       // 설치 위치 후보 — 앞에서부터 실제로 있는 것을 실행
  public bool RequireTitle;      // 제목 있는 창만 본 창으로 침
  public int[] Place;            // 창을 옮길 자리 x,y,가로,세로 (없으면 안 옮김)
  public int WaitSec = 300;      // 창이 뜨길 기다리는 시간 — 느린 현장 PC 는 로딩에 1분 넘게 걸림
}

static class Program {
  static readonly string Pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)") ?? @"C:\Program Files (x86)";
  static readonly string Pf = Environment.GetEnvironmentVariable("ProgramFiles") ?? @"C:\Program Files";
  static readonly string AppData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

  // 켜지는 중엔 제목 없는 창이 잠깐 메인 창처럼 잡혀서 제목이 있는 창만 봄 (로딩 화면은 메인 창으로 안 잡힘)
  static App NovaLct() {
    return new App {
      Process = "NovaLCT",
      ExeList = new[] {
        Path.Combine(AppData, @"Nova Star\NovaLCT\Bin\NovaLCT.exe"),   // V5.9 부터 사용자별 설치
        Path.Combine(Pf86, @"Nova Star\NovaLCT\Bin\NovaLCT.exe"),      // 예전 버전
      },
      RequireTitle = true,
    };
  }

  // ViPlex 메인 창은 제목이 비어 있음 (2026-10 현장 확인) — 제목 있는 창만 고르면 못 찾음
  // 창 자리: LED(x 178 까지) 오른쪽 · 수위계 표(y 176 까지) 아래 · 릴레이 시스템 창(x 1320 부터) 왼쪽. 사용자가 잡아 준 배치 (2026-11-17)
  static App Viplex() {
    return new App {
      Process = "ViPlex Express",
      ExeList = new[] {
        Path.Combine(Pf86, @"Nova Star\ViPlex Express\Bin\ViPlex Express.exe"),
        Path.Combine(Pf, @"Nova Star\ViPlex Express\Bin\ViPlex Express.exe"),
      },
      Place = new[] { 260, 215, 1022, 706 },
    };
  }

  [STAThread]
  static int Main(string[] args) {
    if (args.Length == 0) return Exit.Usage;
    try {
      switch (args[0]) {
        case "front-novalct": return Front(NovaLct(), Has(args, "--start-only"));
        case "front-viplex": return Front(Viplex(), Has(args, "--start-only"));
        case "front": return Front(AppFromArgs(args), Has(args, "--start-only"));
        case "settings": return OpenSettings();
        case "restart":
          return Restart(Opt(args, "--process"), SplitList(Opt(args, "--exe-list")), Opt(args, "--splash-title") ?? "",
            IntOpt(args, "--wait", 120), IntOpt(args, "--close-wait", 15));
        case "boot": return Boot(args);
        case "run-task": return args.Length < 2 ? Exit.Usage : RunTask(args[1], IntOpt(args, "--timeout", 330));
        default: return Exit.Usage;
      }
    } catch (Exception) {
      return Exit.Failed;
    }
  }

  // ── 명령 인자 ──
  static bool Has(string[] args, string flag) { return Array.IndexOf(args, flag) >= 0; }
  static string Opt(string[] args, string name) {
    int i = Array.IndexOf(args, name);
    return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
  }
  static int IntOpt(string[] args, string name, int fallback) {
    int value;
    return int.TryParse(Opt(args, name), out value) ? value : fallback;
  }
  static string[] SplitList(string list) {
    return (list ?? "").Split(new[] { '|' }, StringSplitOptions.RemoveEmptyEntries);
  }
  static App AppFromArgs(string[] args) {
    string place = Opt(args, "--place");
    return new App {
      Process = Opt(args, "--process"),
      ExeList = SplitList(Opt(args, "--exe-list")),
      RequireTitle = Has(args, "--require-title"),
      Place = place == null ? null : place.Split(',').Select(int.Parse).ToArray(),
      WaitSec = IntOpt(args, "--wait", 300),
    };
  }

  // ── 켜고 맨 앞으로 ──
  static bool IsRunning(string process) { return Process.GetProcessesByName(process).Length > 0; }

  static IntPtr FindMainWindow(App app) {
    foreach (Process p in Process.GetProcessesByName(app.Process)) {
      if (p.MainWindowHandle == IntPtr.Zero) continue;
      if (app.RequireTitle && string.IsNullOrEmpty(p.MainWindowTitle)) continue;
      return p.MainWindowHandle;
    }
    return IntPtr.Zero;
  }

  static bool Start(string exe) {
    if (exe == null) return false;
    Process.Start(new ProcessStartInfo { FileName = exe, WorkingDirectory = Path.GetDirectoryName(exe) });
    return true;
  }

  static int Front(App app, bool startOnly) {
    IntPtr window = FindMainWindow(app);
    if (window == IntPtr.Zero) {
      // 프로세스는 있는데 창이 아직이면(켜지는 중) 또 실행하지 않고 기다리기만
      if (!IsRunning(app.Process) && !Start(app.ExeList.FirstOrDefault(File.Exists))) return Exit.NotInstalled;
      if (startOnly) return Exit.Ok;
      DateTime until = DateTime.UtcNow.AddSeconds(app.WaitSec);
      while (window == IntPtr.Zero && DateTime.UtcNow < until) {
        Thread.Sleep(250);
        window = FindMainWindow(app);
      }
      if (window == IntPtr.Zero) return Exit.NoWindow;
    }
    if (startOnly) return Exit.Ok;
    if (app.Place != null) LedWin.Place(window, app.Place[0], app.Place[1], app.Place[2], app.Place[3]);
    LedWin.ForceForeground(window);
    return Exit.Ok;
  }

  // ── 윈도우 설정 ──
  // LED 화면(왼쪽 x<180) 옆 가운데 자리 — LED·오른쪽 프로그램을 안 가림 (y 는 LED 위쪽 끝과 같게)
  static int OpenSettings() {
    Process.Start("ms-settings:");
    IntPtr window = IntPtr.Zero;
    DateTime until = DateTime.UtcNow.AddSeconds(30);
    while (window == IntPtr.Zero && DateTime.UtcNow < until) {
      Thread.Sleep(150);
      window = LedWin.FindSettingsWindow();
    }
    if (window == IntPtr.Zero) return Exit.NoWindow;
    LedWin.Place(window, 300, 183, 760, 560);
    LedWin.ForceForeground(window);
    return Exit.Ok;
  }

  // ── 끄고 다시 켜기 (릴레이 시스템) ──
  static int Restart(string process, string[] exeList, string splashTitle, int waitSec, int closeWaitSec) {
    if (string.IsNullOrEmpty(process)) return Exit.Usage;
    Process[] running = Process.GetProcessesByName(process);
    // 다시 켤 실행 파일 — 켜져 있던 바로 그 파일을 우선 (설치 위치가 후보와 달라도 같은 걸 다시 켬)
    string exe = running.Select(PathOf).FirstOrDefault(path => path != null) ?? exeList.FirstOrDefault(File.Exists);
    if (exe == null) return Exit.NotInstalled;   // 끄기 전에 확인 — 다시 켤 수 없으면 끄지도 않음

    if (running.Length > 0) {
      // 창 닫기로 먼저 끔 — 릴레이 시스템은 닫힐 때 설정 저장·릴레이 OFF·포트 해제를 함. 강제 종료는 그래도 안 꺼질 때만
      // (릴레이 시스템 창은 작업표시줄에 안 나오는 창이라 CloseMainWindow 로는 안 닫힘 → 보이는 창을 직접 찾아 닫기 요청)
      foreach (Process p in running) foreach (IntPtr h in LedWin.VisibleWindows(p.Id)) LedWin.RequestClose(h);
      DateTime closeUntil = DateTime.UtcNow.AddSeconds(closeWaitSec);
      while (IsRunning(process) && DateTime.UtcNow < closeUntil) Thread.Sleep(250);
      foreach (Process p in Process.GetProcessesByName(process)) { try { p.Kill(); } catch (Exception) { } }
      Thread.Sleep(500);
      // 그래도 살아 있으면(관리자 권한으로 떠 있는 경우 등) 다시 켜지 않음 — 두 개가 같이 뜨면 통신 포트를 놓고 싸움
      if (IsRunning(process)) return Exit.WouldNotClose;
    }
    Start(exe);

    // 다 켜질 때까지 기다림 — 시작 화면 말고 제목 있는 창이 보이면 켜진 것 (화면의 "켜는 중" 안내가 그때 사라짐)
    DateTime until = DateTime.UtcNow.AddSeconds(waitSec);
    while (DateTime.UtcNow < until) {
      Thread.Sleep(250);
      bool ready = Process.GetProcessesByName(process)
        .SelectMany(p => LedWin.VisibleWindows(p.Id))
        .Select(LedWin.Title)
        .Any(title => title.Length > 0 && title != splashTitle);
      if (ready) return Exit.Ok;
    }
    return Exit.NoWindow;
  }

  static string PathOf(Process p) {
    try { return p.MainModule.FileName; } catch (Exception) { return null; }
  }

  // ── 부팅 때 한 번 ──
  // 끝났을 때 창 순서: LED 화면 < ViPlex < NovaLCT (사용자가 잡아 준 배치, 2026-11-17). 안 깔린 프로그램은 건너뜀
  // --nova-* · --viplex-* 는 시험용 — 다른 프로그램으로 바꿔 돌려 볼 때만 줌
  static int Boot(string[] args) {
    App nova = NovaLct();
    App viplex = Viplex();
    if (Opt(args, "--nova-process") != null) { nova.Process = Opt(args, "--nova-process"); nova.ExeList = SplitList(Opt(args, "--nova-exe")); nova.RequireTitle = false; }
    if (Opt(args, "--viplex-process") != null) { viplex.Process = Opt(args, "--viplex-process"); viplex.ExeList = SplitList(Opt(args, "--viplex-exe")); }
    int ledWaitSec = IntOpt(args, "--led-wait", 180);   // LED 화면(키오스크 크롬)이 뜨길 기다리는 시간
    int ledPort = IntOpt(args, "--led-port", 9222);     // 키오스크 크롬의 원격 디버깅 포트 (Start-GaramLED.bat 과 같은 값)

    // 먼저 둘 다 켜 둠 (창이 뜨는 데 오래 걸리므로 LED 화면을 기다리는 동안 같이 뜨게)
    Front(nova, true);
    Front(viplex, true);

    // LED 화면이 뜬 뒤에 올림 — 먼저 올리면 나중에 뜨는 LED 화면이 덮음
    DateTime until = DateTime.UtcNow.AddSeconds(ledWaitSec);
    while (!LedScreenIsUp(ledPort) && DateTime.UtcNow < until) Thread.Sleep(1000);
    Thread.Sleep(2000);

    Front(viplex, false);   // 창이 뜰 때까지 기다렸다가 제자리에 놓고 앞으로
    Thread.Sleep(500);      // 앞 창이 바뀌는 중에 바로 또 바꾸면 윈도우가 거절함 — 자리 잡을 틈을 줌
    Front(nova, false);     // 창이 뜰 때까지 기다렸다가 그 위로
    return Exit.Ok;
  }

  static bool LedScreenIsUp(int port) {
    try {
      var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/json");
      request.Timeout = 1000;
      request.Proxy = null;
      using (var response = request.GetResponse())
      using (var reader = new StreamReader(response.GetResponseStream())) {
        return Regex.IsMatch(reader.ReadToEnd(), "\"type\"\\s*:\\s*\"page\"");
      }
    } catch (Exception) {
      return false;
    }
  }

  // ── 관리자 권한 작업 돌리기 ──
  // 설치할 때 관리자 권한으로 등록해 둔 작업은 같은 사용자가 확인 창 없이 돌릴 수 있음. 작업이 끝나길 기다려 그 끝 코드를 그대로 돌려줌
  static int RunTask(string name, int timeoutSec) {
    const int Running = 4;
    dynamic service = Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));
    service.Connect();
    dynamic folder = service.GetFolder("\\");
    dynamic task;
    try { task = folder.GetTask(name); } catch (Exception) { return Exit.NoTask; }

    // 이미 도는 중이면(버튼을 또 누름) 새로 돌리지 않고 그 실행이 끝나길 기다리기만
    dynamic instance = null;
    if ((int)task.State == Running) {
      dynamic instances = task.GetInstances(0);
      if ((int)instances.Count > 0) instance = instances[1];
    }
    if (instance == null) {
      try { instance = task.Run(null); } catch (Exception) { return Exit.NoTask; }
    }
    // 방금 돌린 바로 그 실행이 끝날 때까지 기다림 — 끝나면 Refresh 가 실패함
    // (작업의 "마지막 실행 시각"으로 판단하면 초 단위라, 1초 안에 두 번 누르면 시작한 걸 못 알아채고 끝까지 기다렸음)
    DateTime until = DateTime.UtcNow.AddSeconds(timeoutSec);
    while (DateTime.UtcNow < until) {
      Thread.Sleep(50);
      try { instance.Refresh(); } catch (Exception) { return (int)folder.GetTask(name).LastTaskResult; }
    }
    return Exit.NoWindow;
  }
}
