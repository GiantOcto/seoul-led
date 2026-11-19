// 창 다루는 공용 코드 — ledwin.exe 의 명령들(Program.cs)과 chrome-guard.ps1(window-tools.ps1 로 불러옴)이 같이 씀
// 빌드하는 컴파일러가 윈도우에 기본으로 있는 C# 5 (csc v4.0.30319) 라서 그 문법까지만 씀
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class LedWin {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder text, int max);
  [DllImport("user32.dll", EntryPoint = "GetWindowThreadProcessId")] static extern uint GetWindowProcess(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint message, IntPtr w, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool SetProp(IntPtr h, string name, IntPtr data);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr GetProp(IntPtr h, string name);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();

  // 포커스 훔치기 방지 우회 (ViPlexOnTop 과 같은 방식) — 최소화면 복원 → ALT 눌렀다 떼기 → 앞 창 스레드에 입력 연결 → 잠깐 TOPMOST 로 올렸다 내림
  public static bool ForceForeground(IntPtr h) {
    if (IsIconic(h)) ShowWindow(h, 9);
    keybd_event(0x12, 0, 0, UIntPtr.Zero);
    keybd_event(0x12, 0, 2, UIntPtr.Zero);
    uint fgThread = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
    uint me = GetCurrentThreadId();
    bool attached = fgThread != me && AttachThreadInput(fgThread, me, true);
    SetWindowPos(h, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
    SetWindowPos(h, new IntPtr(-2), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
    BringWindowToTop(h);
    SetForegroundWindow(h);
    if (attached) AttachThreadInput(fgThread, me, false);
    return GetForegroundWindow() == h;
  }

  // 창을 정해진 자리·크기로 (최대화·최소화돼 있으면 먼저 보통 창으로)
  public static void Place(IntPtr h, int x, int y, int width, int height) {
    if (IsIconic(h) || IsZoomed(h)) ShowWindow(h, 9);
    SetWindowPos(h, IntPtr.Zero, x, y, width, height, 0x0004);
  }

  // 프로세스가 띄운 보이는 창들 — 작업표시줄에 안 나오는 창도 찾음
  // (Process.MainWindowHandle 은 릴레이 시스템처럼 작업표시줄에 안 나오게 만든 창을 못 찾아 0 이 됨 — 2026-11-17 확인)
  public static List<IntPtr> VisibleWindows(int processId) {
    var found = new List<IntPtr>();
    EnumWindows((h, l) => {
      uint pid; GetWindowProcess(h, out pid);
      if (pid == (uint)processId && IsWindowVisible(h)) found.Add(h);
      return true;
    }, IntPtr.Zero);
    return found;
  }

  public static string Title(IntPtr h) {
    var text = new StringBuilder(256);
    GetWindowText(h, text, 256);
    return text.ToString();
  }

  // 창에 닫기를 요청 (X 를 누른 것과 같음 — 프로그램이 저장·정리를 하고 스스로 꺼짐)
  public static void RequestClose(IntPtr h) {
    PostMessage(h, 0x0010, IntPtr.Zero, IntPtr.Zero);
  }

  // 전체 화면 창(LED 키오스크 크롬) 위에도 작업표시줄이 계속 보이게 함
  // 윈도우는 화면을 다 덮는 창이 맨 앞에 오면 작업표시줄을 그 뒤로 내리는데, 창에 NonRudeHWND 표시를 붙이면 그 창은 전체 화면으로 치지 않음
  // (윈도우 7 부터 있는 정식 표시. 창 크기를 1픽셀 줄이는 방법은 키오스크 크롬이 스스로 꺼져서 못 씀 — 2026-11-18 확인)
  // 이미 붙어 있으면 아무것도 안 하고 false, 새로 붙였으면 true
  public static bool KeepTaskbarVisibleOver(IntPtr h) {
    if (GetProp(h, "NonRudeHWND") != IntPtr.Zero) return false;
    SetProp(h, "NonRudeHWND", new IntPtr(1));
    // 그 창이 지금 맨 앞이면 작업표시줄은 이미 내려가 있음 — 윈도우는 맨 앞 창이 바뀔 때만 다시 판단하므로 작업표시줄에 잠깐 갔다 옴
    // (맨 앞이 아니면 작업표시줄이 보이는 상태라 그대로 둠 — 떠 있는 다른 프로그램 창을 LED 화면으로 덮지 않게)
    if (GetForegroundWindow() == h) {
      IntPtr taskbar = FindWindow("Shell_TrayWnd", null);
      if (taskbar != IntPtr.Zero) {
        Activate(taskbar);
        System.Threading.Thread.Sleep(300);
        Activate(h);
      }
    }
    return true;
  }

  // 창을 맨 앞 창으로만 바꿈 (순서·자리는 안 건드림) — ALT 를 눌렀다 떼면 다른 프로그램이 앞 창을 바꾸는 걸 윈도우가 허용함
  static void Activate(IntPtr h) {
    keybd_event(0x12, 0, 0, UIntPtr.Zero);
    keybd_event(0x12, 0, 2, UIntPtr.Zero);
    SetForegroundWindow(h);
  }

  // 윈도우 설정 창 (제목이 윈도우 언어에 따라 "설정" 또는 "Settings"), 없으면 0
  public static IntPtr FindSettingsWindow() {
    IntPtr h = FindWindow("ApplicationFrameWindow", "설정");
    return h != IntPtr.Zero ? h : FindWindow("ApplicationFrameWindow", "Settings");
  }
}
