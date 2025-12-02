namespace RelayWebApi.Services
{
    public class SensorDataService
    {
        // 최신 센서 데이터
        public float SentrionTemp { get; set; }
        public float SentrionHumidity { get; set; }
        public float EcTemp { get; set; }
        public float EcHumidity { get; set; }
        public float H2S { get; set; }

        // 릴레이 상태
        public bool Relay3Status { get; set; } // 함내습도용
        public bool Relay4Status { get; set; } // H2S용

        public DateTime LastUpdated { get; set; }
    }
}