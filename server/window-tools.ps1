# 창 다루는 공용 코드 — novalct-front.ps1 · windows-settings.ps1 이 불러 씀 (. "$PSScriptRoot\window-tools.ps1")
Add-Type @"
using System; using System.Runtime.InteropServices;
public class LedWin {
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

  // 윈도우 설정 창 (제목이 윈도우 언어에 따라 "설정" 또는 "Settings"), 없으면 0
  public static IntPtr FindSettingsWindow() {
    IntPtr h = FindWindow("ApplicationFrameWindow", "설정");
    return h != IntPtr.Zero ? h : FindWindow("ApplicationFrameWindow", "Settings");
  }
}
"@
