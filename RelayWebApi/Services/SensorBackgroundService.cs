using RelayWebApi.Controllers;
using RelayWebApi.Sensors;

namespace RelayWebApi.Services
{
    public class SensorBackgroundService : BackgroundService
    {
        private readonly SensorDataService _dataService;
        private readonly ILogger<SensorBackgroundService> _logger;
        private SentrionSensor _sentrion;
        private ECSensor _ecSensor;
        private RelayController _relay;

        public SensorBackgroundService(
            SensorDataService dataService,
            ILogger<SensorBackgroundService> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("센서 백그라운드 서비스 시작");

            // 센서 및 릴레이 초기화
            try
            {
                _sentrion = new SentrionSensor();
                _sentrion.Connect("COM6");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Sentrion 센서 연결 실패: {ex.Message}");
                _sentrion = null; // 연결 실패 시 null로 설정
            }

            try
            {
                _ecSensor = new ECSensor();
                _ecSensor.Connect("COM7");
            }
            catch (Exception ex)
            {
                _logger.LogError($"EC 센서 연결 실패: {ex.Message}");
                _ecSensor = null; // 연결 실패 시 null로 설정
            }

            _relay = new RelayController("192.168.0.100");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    float h2s = 0, ecHumi = 0, ecTemp = 0;
                    if (_ecSensor != null)
                    {
                        try
                        {
                            (h2s, ecHumi, ecTemp) = _ecSensor.ReadData();
                        }
                        catch (Exception ex) when (ex.Message.Contains("closed") || ex.Message.Contains("port"))
                        {
                            // 포트가 닫혔을 때 재연결 시도
                            _logger.LogWarning($"EC 센서 포트 오류 감지, 재연결 시도: {ex.Message}");
                            try
                            {
                                _ecSensor.Dispose();
                                _ecSensor = new ECSensor();
                                _ecSensor.Connect("COM7");
                                _logger.LogInformation("EC 센서 재연결 성공");
                                // 재연결 후 바로 읽기 시도하지 않고 다음 루프에서 시도
                                await Task.Delay(1000, stoppingToken);
                                continue;
                            }
                            catch (Exception reconnectEx)
                            {
                                _logger.LogError($"EC 센서 재연결 실패: {reconnectEx.Message}");
                                _ecSensor = null;
                            }
                        }
                    }

                    float sentrionHumi = 0, sentrionTemp = 0;
                    if (_sentrion != null)
                    {
                        try
                        {
                            (sentrionHumi, sentrionTemp) = _sentrion.ReadData();
                        }
                        catch (Exception ex) when (ex.Message.Contains("closed") || ex.Message.Contains("port"))
                        {
                            // 포트가 닫혔을 때 재연결 시도
                            _logger.LogWarning($"Sentrion 센서 포트 오류 감지, 재연결 시도: {ex.Message}");
                            try
                            {
                                _sentrion.Dispose();
                                _sentrion = new SentrionSensor();
                                _sentrion.Connect("COM6");
                                _logger.LogInformation("Sentrion 센서 재연결 성공");
                                // 재연결 후 바로 읽기 시도하지 않고 다음 루프에서 시도
                                await Task.Delay(1000, stoppingToken);
                                continue;
                            }
                            catch (Exception reconnectEx)
                            {
                                _logger.LogError($"Sentrion 센서 재연결 실패: {reconnectEx.Message}");
                                _sentrion = null;
                            }
                        }
                    }

                    // 데이터 저장
                    _dataService.SentrionTemp = sentrionTemp;
                    _dataService.SentrionHumidity = sentrionHumi;
                    _dataService.EcTemp = ecTemp;
                    _dataService.EcHumidity = ecHumi;
                    _dataService.H2S = h2s;
                    _dataService.LastUpdated = DateTime.Now;

                    // 릴레이 4번 제어 (H2S)
                    if (h2s >= 0.001f)
                    {
                        await _relay.TurnOnAsync(3);
                        _dataService.Relay4Status = true;
                    }
                    else
                    {
                        await _relay.TurnOffAsync(3);
                        _dataService.Relay4Status = false;
                    }

                    // 릴레이 3번 제어 (함내습도)
                    if (ecHumi >= 50.0f)
                    {
                        await _relay.TurnOnAsync(2);
                        _dataService.Relay3Status = true;
                    }
                    else
                    {
                        await _relay.TurnOffAsync(2);
                        _dataService.Relay3Status = false;
                    }

                    _logger.LogInformation("\n" +
                        "========================================\n" +
                        $"[{DateTime.Now:HH:mm:ss}] 센서 데이터 업데이트\n" +
                        "========================================\n" +
                        $"Sentrion - 온도: {sentrionTemp}°C, 습도: {sentrionHumi}%\n" +
                        $"EC Sense - H2S: {h2s}ppm, 함내온도: {ecTemp}°C, 함내습도: {ecHumi}%\n" +
                        $"릴레이 3번(습도): {(_dataService.Relay3Status ? "ON" : "OFF")}\n" +
                        $"릴레이 4번(H2S): {(_dataService.Relay4Status ? "ON" : "OFF")}\n" +
                        "========================================");

                    // TaskCanceledException 처리: 취소 요청 시 정상 종료
                    try
                    {
                        await Task.Delay(2000, stoppingToken); // 2초 대기
                    }
                    catch (TaskCanceledException)
                    {
                        // 정상 종료 신호이므로 루프 종료
                        _logger.LogInformation("센서 백그라운드 서비스 종료 요청");
                        break;
                    }
                }
                catch (TaskCanceledException)
                {
                    // 정상 종료 신호
                    _logger.LogInformation("센서 백그라운드 서비스 종료 요청");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError($"센서 읽기 오류: {ex.Message}");
                    try
                    {
                        await Task.Delay(2000, stoppingToken);
                    }
                    catch (TaskCanceledException)
                    {
                        // 정상 종료 신호
                        _logger.LogInformation("센서 백그라운드 서비스 종료 요청");
                        break;
                    }
                }
            }
            
            _logger.LogInformation("센서 백그라운드 서비스 종료");
        }
    }
}