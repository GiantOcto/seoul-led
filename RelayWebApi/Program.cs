using RelayWebApi.Services;
using System.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// 포트 설정 (프로덕션 환경에서도 5130 사용)
builder.WebHost.UseUrls("http://localhost:5130");

// 로깅 완전 재구성 - Microsoft.AspNetCore 로그 완전 차단, RelayWebApi만 출력
builder.Logging.ClearProviders();

// Microsoft 관련 로그 완전 차단 (Console 로거 추가 전에 필터 설정)
builder.Logging.AddFilter("Microsoft", LogLevel.None);
// RelayWebApi만 Information 레벨로 출력
builder.Logging.AddFilter("RelayWebApi", LogLevel.Information);

// Console 로거 추가
builder.Logging.AddConsole();

// 백그라운드 서비스 예외 처리 설정 (서비스가 예외를 던져도 호스트가 중지되지 않도록)
builder.Services.Configure<HostOptions>(options =>
{
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 센서 데이터 서비스 등록 (Singleton)
builder.Services.AddSingleton<SensorDataService>();

// 백그라운드 서비스 등록
builder.Services.AddHostedService<SensorBackgroundService>();

// CORS 설정 (React에서 접근 가능하도록)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",  // React 기본 포트 (react-scripts)
                "http://localhost:5173"   // Vite 기본 포트
              )
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact"); // CORS 활성화

app.UseAuthorization();

app.MapControllers();


// 정적 파일 서빙 (프로덕션 환경)
if (!app.Environment.IsDevelopment())
{
    // 배포 폴더 구조: publish 폴더와 같은 레벨에 build 폴더가 있는 경우
    var currentDir = Directory.GetCurrentDirectory();
    var clientBuildPath1 = Path.Combine(currentDir, "..", "build");
    var clientBuildPath2 = Path.Combine(currentDir, "..", "..", "client", "build");
    
    Console.WriteLine($"현재 디렉토리: {currentDir}");
    Console.WriteLine($"경로 1 확인: {clientBuildPath1} (존재: {Directory.Exists(clientBuildPath1)})");
    Console.WriteLine($"경로 2 확인: {clientBuildPath2} (존재: {Directory.Exists(clientBuildPath2)})");
    
    string? clientBuildFullPath = null;
    
    if (Directory.Exists(clientBuildPath1))
    {
        clientBuildFullPath = Path.GetFullPath(clientBuildPath1);
        Console.WriteLine($"✅ 정적 파일 경로 찾음: {clientBuildFullPath}");
    }
    else if (Directory.Exists(clientBuildPath2))
    {
        clientBuildFullPath = Path.GetFullPath(clientBuildPath2);
        Console.WriteLine($"✅ 정적 파일 경로 찾음: {clientBuildFullPath}");
    }
    else
    {
        Console.WriteLine($"❌ 정적 파일 경로를 찾을 수 없습니다!");
    }
    
    if (!string.IsNullOrEmpty(clientBuildFullPath) && Directory.Exists(clientBuildFullPath))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(clientBuildFullPath),
            RequestPath = ""
        });
        
        // SPA 라우팅 지원
        app.MapFallbackToFile("index.html", new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(clientBuildFullPath)
        });
        
        Console.WriteLine($"✅ 정적 파일 서빙 활성화됨");
    }
}

// 개발 환경: React 개발 서버 실행
if (app.Environment.IsDevelopment())
{
    _ = Task.Run(() =>
    {
        try
        {
            // 실행 파일 위치에서 프로젝트 루트 찾기
            var currentDir = Directory.GetCurrentDirectory();
            var projectRoot = currentDir;
            
            // bin/Debug/net8.0 같은 경로에서 프로젝트 루트로 이동
            while (!string.IsNullOrEmpty(projectRoot) && 
                   !File.Exists(Path.Combine(projectRoot, "RelayWebApi.csproj")))
            {
                var parent = Directory.GetParent(projectRoot);
                if (parent == null) break;
                projectRoot = parent.FullName;
            }
            
            // 프로젝트 루트에서 상위로 가서 client 폴더 찾기
            if (!string.IsNullOrEmpty(projectRoot))
            {
                var parentDir = Directory.GetParent(projectRoot)?.FullName;
                if (!string.IsNullOrEmpty(parentDir))
                {
                    var clientPath = Path.Combine(parentDir, "client");
                    var clientFullPath = Path.GetFullPath(clientPath);
                    
                    if (Directory.Exists(clientFullPath))
                    {
                        var startInfo = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = $"/c cd /d \"{clientFullPath}\" && npm start",
                            UseShellExecute = true,
                            CreateNoWindow = false,
                            WindowStyle = ProcessWindowStyle.Normal
                        };
                        
                        Process.Start(startInfo);
                        Console.WriteLine($"✅ 프론트엔드 자동 실행: {clientFullPath}");
                    }
                    else
                    {
                        Console.WriteLine($"⚠️ 프론트엔드 경로를 찾을 수 없습니다: {clientFullPath}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ 프론트엔드 자동 실행 실패: {ex.Message}");
        }
    });
}
// 프로덕션 환경: 브라우저를 키오스크 모드로 자동 실행
else
{
    _ = Task.Run(async () =>
    {
        try
        {
            // 서버가 완전히 시작될 때까지 대기
            await Task.Delay(3000);
            
            var url = "http://localhost:5130";
            
            // Chrome 경로 찾기
            var chromePaths = new[]
            {
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Google\Chrome\Application\chrome.exe"
            };
            
            string? chromePath = null;
            foreach (var path in chromePaths)
            {
                if (File.Exists(path))
                {
                    chromePath = path;
                    break;
                }
            }
            
            if (!string.IsNullOrEmpty(chromePath))
            {
                // Chrome을 키오스크 모드로 실행
                var startInfo = new ProcessStartInfo
                {
                    FileName = chromePath,
                    Arguments = $"--kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state {url}",
                    UseShellExecute = false,
                    CreateNoWindow = false
                };
                
                Process.Start(startInfo);
                Console.WriteLine($"✅ 브라우저 키오스크 모드 실행: {url}");
            }
            else
            {
                // Chrome을 찾을 수 없으면 기본 브라우저로 실행
                var startInfo = new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                };
                
                Process.Start(startInfo);
                Console.WriteLine($"✅ 브라우저 실행: {url} (기본 브라우저)");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ 브라우저 자동 실행 실패: {ex.Message}");
        }
    });
}

Console.WriteLine($"🌐 서버 시작: http://localhost:5130");

app.Run();
