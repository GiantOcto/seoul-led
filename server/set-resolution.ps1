# 헤더 "해상도" 버튼 — 주 모니터 해상도를 1920x1080 으로 강제 설정 (원격 접속·드라이버 탓에 해상도가 바뀌면 LED 송출 자리가 어긋남)
# 모니터가 "Generic Non-PnP Monitor" 로 잡히는 현장은 일반 방식 변경이 -1 로 실패하고, 윈도우 디스플레이 설정에서도 안 바뀜.
# 디스플레이 어댑터 속성의 "모든 모드 표시"로만 바뀌어서 (2026-11-16 포항 현장), 그 창이 하는 순서를 그대로 따라 함:
#   ① 전체 목록에서 고른 모드를 그대로 저장만 함 (화면은 아직 안 바꿈)  ② 저장된 설정을 전체 목록 기준으로 적용
#   (순서와 플래그 값은 윈도우 display.dll 이 부르는 자리에서 확인)
# 그게 안 되면 다른 방식을 차례로 시도하고, 하나라도 실제로 바뀌면 멈춤. 시도 내용은 전부 출력(서버 로그용)
# 끝 코드: 0 성공(이미 맞는 경우 포함) / 2 현재 설정을 못 읽음 / 3 모든 방식이 실패
# -Test: 실제로 안 바꾸고 각 방식이 받아들여지는지만 확인
param([int]$Width = 1920, [int]$Height = 1080, [switch]$Test)

Add-Type @"
using System; using System.Collections.Generic; using System.Runtime.InteropServices;
public class DisplayRes {
  // ── 예전 방식 API (ChangeDisplaySettingsEx) — "모든 모드 표시" 창이 쓰는 쪽 ──
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DEVMODE {
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
    public short dmSpecVersion, dmDriverVersion, dmSize, dmDriverExtra;
    public int dmFields;
    public int dmPositionX, dmPositionY, dmDisplayOrientation, dmDisplayFixedOutput;
    public short dmColor, dmDuplex, dmYResolution, dmTTOption, dmCollate;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
    public short dmLogPixels;
    public int dmBitsPerPel, dmPelsWidth, dmPelsHeight, dmDisplayFlags, dmDisplayFrequency;
    public int dmICMMethod, dmICMIntent, dmMediaType, dmDitherType, dmReserved1, dmReserved2, dmPanningWidth, dmPanningHeight;
  }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DISPLAY_DEVICE {
    public int cb;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
    public int StateFlags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
  }
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool EnumDisplayDevices(string device, uint index, ref DISPLAY_DEVICE info, uint flags);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool EnumDisplaySettingsEx(string device, int mode, ref DEVMODE dm, int flags);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int ChangeDisplaySettingsEx(string device, ref DEVMODE dm, IntPtr hwnd, int flags, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "ChangeDisplaySettingsExW")] static extern int ChangeWithoutMode(string device, IntPtr noMode, IntPtr hwnd, int flags, IntPtr lParam);

  const int EDS_RAWMODE = 2;                  // 모니터가 알려준 것만이 아니라 그래픽 카드의 모든 모드 ("모든 모드 표시"와 같은 목록)
  const int CURRENT = -1;
  const int CDS_UPDATEREGISTRY = 1;           // 저장해서 재부팅 뒤에도 유지
  const int CDS_TEST = 2;
  const int CDS_SET_PRIMARY = 0x10;
  const int CDS_RAWMODE = 0x40;               // 전체 목록 기준으로 처리. 문서엔 없지만 display.dll 이 쓰는 값
  const int CDS_ENABLE_UNSAFE_MODES = 0x100;  // "이 모니터에서 표시할 수 없는 모드 숨기기"를 끄는 것과 같음
  const int CDS_NORESET = 0x10000000;         // 저장만 하고 화면은 아직 안 바꿈
  const int DM_POSITION = 0x20;
  const int FIELDS_SIZE = 0x80000 | 0x100000; // 가로·세로
  const int PRIMARY_DEVICE = 4;
  const int PREFERRED_HZ = 60;

  // ── 새 방식 API (SetDisplayConfig) — 윈도우 디스플레이 설정 화면이 쓰는 쪽 ──
  [StructLayout(LayoutKind.Sequential)] public struct LUID { public uint LowPart; public int HighPart; }
  [StructLayout(LayoutKind.Sequential)] public struct RATIONAL { public uint Numerator, Denominator; }
  [StructLayout(LayoutKind.Sequential)] public struct PATH_SOURCE { public LUID adapterId; public uint id, modeInfoIdx, statusFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct PATH_TARGET {
    public LUID adapterId; public uint id, modeInfoIdx, outputTechnology, rotation, scaling;
    public RATIONAL refreshRate; public uint scanLineOrdering; public int targetAvailable; public uint statusFlags;
  }
  [StructLayout(LayoutKind.Sequential)] public struct PATH_INFO { public PATH_SOURCE sourceInfo; public PATH_TARGET targetInfo; public uint flags; }
  [StructLayout(LayoutKind.Explicit, Size = 64)] public struct MODE_INFO {
    [FieldOffset(0)] public uint infoType; [FieldOffset(4)] public uint id; [FieldOffset(8)] public LUID adapterId;
    // infoType 1 = 화면(소스)
    [FieldOffset(16)] public uint srcWidth; [FieldOffset(20)] public uint srcHeight; [FieldOffset(24)] public uint srcPixelFormat;
    [FieldOffset(28)] public int srcX; [FieldOffset(32)] public int srcY;
    // infoType 2 = 출력 신호(타깃)
    [FieldOffset(16)] public ulong pixelRate; [FieldOffset(24)] public RATIONAL hSync; [FieldOffset(32)] public RATIONAL vSync;
    [FieldOffset(40)] public uint activeW; [FieldOffset(44)] public uint activeH; [FieldOffset(48)] public uint totalW; [FieldOffset(52)] public uint totalH;
    [FieldOffset(56)] public uint videoStandard; [FieldOffset(60)] public uint scanLineOrdering;
  }
  [DllImport("user32.dll")] static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPaths, out uint numModes);
  [DllImport("user32.dll")] static extern int QueryDisplayConfig(uint flags, ref uint numPaths, [In, Out] PATH_INFO[] paths, ref uint numModes, [In, Out] MODE_INFO[] modes, IntPtr topology);
  [DllImport("user32.dll")] static extern int SetDisplayConfig(uint numPaths, [In] PATH_INFO[] paths, uint numModes, [In] MODE_INFO[] modes, uint flags);

  const uint QDC_ONLY_ACTIVE_PATHS = 2;
  const uint SDC_USE_SUPPLIED = 0x20, SDC_VALIDATE = 0x40, SDC_APPLY = 0x80, SDC_SAVE = 0x200, SDC_ALLOW_CHANGES = 0x400;
  const uint MODE_IDX_INVALID = 0xffffffff, INFO_SOURCE = 1, INFO_TARGET = 2, SCALING_IDENTITY = 1, PROGRESSIVE = 1, STANDARD_OTHER = 255;

  // ── 환경 확인용 (작업 묶음이 해상도 변경을 막고 있는지) ──
  [DllImport("kernel32.dll")] static extern bool QueryInformationJobObject(IntPtr job, int infoClass, out uint info, int length, IntPtr returned);

  static int width, height;
  static bool test;
  static string device;     // 주 모니터 장치 이름 (예: \\.\DISPLAY1)

  static DEVMODE NewMode() {
    DEVMODE dm = new DEVMODE();
    dm.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE));
    return dm;
  }

  static bool ReadCurrent(out DEVMODE dm) {
    dm = NewMode();
    return EnumDisplaySettingsEx(device, CURRENT, ref dm, 0);
  }

  static string FindPrimaryDevice() {
    for (uint i = 0; ; i++) {
      DISPLAY_DEVICE info = new DISPLAY_DEVICE();
      info.cb = Marshal.SizeOf(typeof(DISPLAY_DEVICE));
      if (!EnumDisplayDevices(null, i, ref info, 0)) return null;
      if ((info.StateFlags & PRIMARY_DEVICE) != 0) return info.DeviceName;
    }
  }

  // 방식 하나가 끝난 뒤: 응답이 성공이고 화면이 실제로 원하는 크기가 됐는지 (시험 모드는 응답만 봄)
  static bool Worked(int result) {
    if (result != 0) return false;
    if (test) return true;
    DEVMODE now;
    bool ok = ReadCurrent(out now) && now.dmPelsWidth == width && now.dmPelsHeight == height;
    if (!ok) Console.WriteLine("  answered 0 but screen is still " + now.dmPelsWidth + "x" + now.dmPelsHeight);
    return ok;
  }

  static string Describe(DEVMODE dm) {
    return dm.dmPelsWidth + "x" + dm.dmPelsHeight + " " + dm.dmBitsPerPel + "bit " + dm.dmDisplayFrequency + "Hz";
  }

  static int Change(string onDevice, DEVMODE dm, int flags, string label) {
    int result = ChangeDisplaySettingsEx(onDevice, ref dm, IntPtr.Zero, flags, IntPtr.Zero);
    Console.WriteLine(label + " " + Describe(dm) + " flags=0x" + flags.ToString("x") + " -> " + result);
    return result;
  }

  // 그래픽 카드 전체 목록에서 원하는 크기를 찾음 (윈도우가 채워 준 값 그대로 둠). 60Hz 를 앞에 두고, 같은 주사율·맞춤 방식은 한 번만
  static List<DEVMODE> FindCardModes() {
    List<DEVMODE> found = new List<DEVMODE>();
    List<string> seen = new List<string>();
    for (int i = 0; ; i++) {
      DEVMODE dm = NewMode();
      if (!EnumDisplaySettingsEx(device, i, ref dm, EDS_RAWMODE)) break;
      if (dm.dmPelsWidth != width || dm.dmPelsHeight != height || dm.dmBitsPerPel != 32 || dm.dmDisplayFlags != 0) continue;
      string key = dm.dmDisplayFrequency + "/" + dm.dmDisplayFixedOutput;
      if (seen.Contains(key)) continue;
      seen.Add(key);
      if (dm.dmDisplayFrequency == PREFERRED_HZ) found.Insert(0, dm); else found.Add(dm);
    }
    return found;
  }

  // 방식 1 — "모든 모드 표시" 창과 같은 순서: 고른 모드를 주 모니터에 저장만 → 저장된 설정을 전체 목록 기준으로 적용
  static bool LikeAllModesWindow(DEVMODE dm, DEVMODE current) {
    dm.dmFields |= DM_POSITION;
    dm.dmPositionX = current.dmPositionX; dm.dmPositionY = current.dmPositionY;
    int own = CDS_RAWMODE | CDS_SET_PRIMARY;
    if (test) return Change(device, dm, CDS_TEST | own, "window check") == 0;
    if (Change(device, dm, CDS_UPDATEREGISTRY | CDS_NORESET | own, "window store") != 0) return false;
    int result = ChangeWithoutMode(null, IntPtr.Zero, IntPtr.Zero, CDS_RAWMODE, IntPtr.Zero);
    Console.WriteLine("window apply flags=0x40 -> " + result);
    return Worked(result);
  }

  // 방식 2 — 한 번에 바꾸기 (모니터가 정상으로 잡힌 PC 는 이걸로 됨)
  static bool Direct(DEVMODE dm) {
    int apply = test ? CDS_TEST : CDS_UPDATEREGISTRY;
    if (Worked(Change(null, dm, apply | CDS_RAWMODE, "direct raw"))) return true;
    return Worked(Change(null, dm, apply, "direct"));
  }

  // 방식 4·5 — 윈도우 디스플레이 설정 화면이 쓰는 API. exactSignal = 출력 신호(표준 1080p 60Hz)까지 직접 지정, 아니면 윈도우가 고르게 둠
  static bool Config(bool exactSignal) {
    string label = exactSignal ? "config exact" : "config auto";
    uint pathCount, modeCount;
    int result = GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, out pathCount, out modeCount);
    if (result != 0) { Console.WriteLine(label + " sizes -> " + result); return false; }
    PATH_INFO[] paths = new PATH_INFO[pathCount];
    MODE_INFO[] modes = new MODE_INFO[modeCount];
    result = QueryDisplayConfig(QDC_ONLY_ACTIVE_PATHS, ref pathCount, paths, ref modeCount, modes, IntPtr.Zero);
    if (result != 0) { Console.WriteLine(label + " query -> " + result); return false; }

    int edited = 0;
    for (int p = 0; p < pathCount; p++) {
      uint source = paths[p].sourceInfo.modeInfoIdx, target = paths[p].targetInfo.modeInfoIdx;
      if (source >= modeCount || modes[source].infoType != INFO_SOURCE) continue;
      if (modes[source].srcX != 0 || modes[source].srcY != 0) continue;   // 주 모니터(0,0)만
      modes[source].srcWidth = (uint)width; modes[source].srcHeight = (uint)height;
      paths[p].targetInfo.scaling = SCALING_IDENTITY;
      paths[p].targetInfo.scanLineOrdering = PROGRESSIVE;
      paths[p].targetInfo.refreshRate.Numerator = PREFERRED_HZ; paths[p].targetInfo.refreshRate.Denominator = 1;
      if (exactSignal && target < modeCount && modes[target].infoType == INFO_TARGET) {
        Console.WriteLine("  signal was " + modes[target].activeW + "x" + modes[target].activeH + " total " + modes[target].totalW + "x" + modes[target].totalH + " pixelRate " + modes[target].pixelRate);
        // 표준 1080p 60Hz 신호 (CEA-861): 148.5MHz, 전체 2200x1125
        modes[target].pixelRate = 148500000;
        modes[target].hSync.Numerator = 148500000; modes[target].hSync.Denominator = 2200;
        modes[target].vSync.Numerator = 148500000; modes[target].vSync.Denominator = 2200 * 1125;
        modes[target].activeW = 1920; modes[target].activeH = 1080; modes[target].totalW = 2200; modes[target].totalH = 1125;
        modes[target].videoStandard = STANDARD_OTHER; modes[target].scanLineOrdering = PROGRESSIVE;
        paths[p].targetInfo.refreshRate = modes[target].vSync;
      } else {
        paths[p].targetInfo.modeInfoIdx = MODE_IDX_INVALID;               // 출력 신호는 윈도우가 고름
      }
      edited++;
    }
    if (edited == 0) { Console.WriteLine(label + " no primary path (paths " + pathCount + ")"); return false; }

    uint flags = SDC_USE_SUPPLIED | (test ? SDC_VALIDATE : SDC_APPLY | SDC_SAVE | SDC_ALLOW_CHANGES);
    result = SetDisplayConfig(pathCount, paths, modeCount, modes, flags);
    Console.WriteLine(label + " paths " + pathCount + " flags=0x" + flags.ToString("x") + " -> " + result);
    return Worked(result);
  }

  public static int Set(int targetWidth, int targetHeight, bool testOnly) {
    width = targetWidth; height = targetHeight; test = testOnly;
    device = FindPrimaryDevice();
    DEVMODE current;
    if (!ReadCurrent(out current)) return 2;
    uint jobLimits;
    bool inLimitedJob = QueryInformationJobObject(IntPtr.Zero, 4, out jobLimits, 4, IntPtr.Zero);   // 4 = 화면 관련 제한, 0x10 = 해상도 변경 금지
    Console.WriteLine("current " + Describe(current) + " on " + device + " session " + System.Diagnostics.Process.GetCurrentProcess().SessionId
      + " job " + (inLimitedJob ? "0x" + jobLimits.ToString("x") : "none"));
    if (!test && current.dmPelsWidth == width && current.dmPelsHeight == height) return 0;

    List<DEVMODE> cardModes = FindCardModes();
    Console.WriteLine("card modes " + cardModes.Count);
    bool ok = false;
    foreach (DEVMODE dm in cardModes) {
      Console.WriteLine("mode " + Describe(dm) + " fields=0x" + dm.dmFields.ToString("x") + " fit=" + dm.dmDisplayFixedOutput);
      if (LikeAllModesWindow(dm, current)) { ok = true; if (!test) return 0; }
      if (Direct(dm)) { ok = true; if (!test) return 0; }
    }

    // 방식 3 — "이 모니터에서 표시할 수 없는 모드 숨기기"를 끈 것과 같은 상태로 만든 뒤 방식 1 을 한 번 더
    if (!test && cardModes.Count > 0) {
      Console.WriteLine("unsafe modes on -> " + ChangeWithoutMode(device, IntPtr.Zero, IntPtr.Zero, CDS_ENABLE_UNSAFE_MODES, IntPtr.Zero));
      if (LikeAllModesWindow(cardModes[0], current)) return 0;
    }

    if (Config(false)) { ok = true; if (!test) return 0; }
    if (width == 1920 && height == 1080 && Config(true)) { ok = true; if (!test) return 0; }

    // 끝으로 예전 방식 — 지금 설정에서 가로·세로만 바꿔 요청
    current.dmPelsWidth = width; current.dmPelsHeight = height;
    current.dmFields = FIELDS_SIZE;
    if (Worked(Change(null, current, test ? CDS_TEST : CDS_UPDATEREGISTRY, "size only"))) ok = true;
    return ok ? 0 : 3;
  }
}
"@

exit [DisplayRes]::Set($Width, $Height, $Test.IsPresent)
