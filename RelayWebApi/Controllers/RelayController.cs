using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace RelayWebApi.Controllers
{
    /// <summary>
    /// 딩티안 릴레이 보드 HTTP 제어 클래스
    /// - IP: 192.168.0.100 (기본값)
    /// - 프로토콜: HTTP GET CGI 방식
    /// - 릴레이 번호: 0~3 (0=1번, 1=2번, 2=3번, 3=4번)
    /// </summary>
    public class RelayController
    {
        // HTTP 통신용 클라이언트 (웹 요청 보내는 객체)
        private readonly HttpClient _httpClient;

        // 릴레이 보드 기본 URL (예: http://192.168.0.100)
        private readonly string _baseUrl;

        /// <summary>
        /// 릴레이 컨트롤러 생성자
        /// </summary>
        /// <param name="ipAddress">릴레이 보드 IP 주소 (예: "192.168.0.100")</param>
        public RelayController(string ipAddress)
        {
            // 기본 URL 조립 (http:// 자동 추가)
            _baseUrl = $"http://{ipAddress}";

            // HttpClient 생성 및 타임아웃 설정
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(5)  // 5초 안에 응답 없으면 에러
            };
        }

        /// <summary>
        /// 릴레이 켜기 (ON)
        /// - HTTP GET으로 /relay_cgi.cgi 호출
        /// - type=0: 일반 ON/OFF 제어
        /// - on=1: 켜기
        /// </summary>
        /// <param name="relayNumber">릴레이 번호 (0~3, 0=1번 릴레이)</param>
        /// <returns>성공 true, 실패 false</returns>
        public async Task<bool> TurnOnAsync(int relayNumber)
        {
            try
            {
                // URL 조립
                // 예: http://192.168.0.100/relay_cgi.cgi?type=0&relay=0&on=1&time=0&pwd=0
                string url = $"{_baseUrl}/relay_cgi.cgi?type=0&relay={relayNumber}&on=1&time=0&pwd=0";

                // HTTP GET 요청 보내기 (비동기)
                HttpResponseMessage response = await _httpClient.GetAsync(url);

                // 응답 성공 여부 체크 (HTTP 200~299)
                if (response.IsSuccessStatusCode)
                {
                    // 성공 메시지 출력 (relayNumber는 0부터 시작이니 +1 해서 표시)
                    Console.WriteLine($"[SUCCESS] 릴레이 {relayNumber + 1}번 ON");
                    return true;
                }
                else
                {
                    // HTTP 에러 코드 출력 (예: 404, 500 등)
                    Console.WriteLine($"[FAIL] 릴레이 {relayNumber + 1}번 ON 실패 (HTTP {response.StatusCode})");
                    return false;
                }
            }
            catch (Exception ex)
            {
                // 네트워크 에러, 타임아웃 등 예외 처리
                Console.WriteLine($"[ERROR] 릴레이 {relayNumber + 1}번 ON 에러: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 릴레이 끄기 (OFF)
        /// - HTTP GET으로 /relay_cgi.cgi 호출
        /// - type=0: 일반 ON/OFF 제어
        /// - on=0: 끄기
        /// </summary>
        /// <param name="relayNumber">릴레이 번호 (0~3, 0=1번 릴레이)</param>
        /// <returns>성공 true, 실패 false</returns>
        public async Task<bool> TurnOffAsync(int relayNumber)
        {
            try
            {
                // URL 조립 (on=0만 다름)
                // 예: http://192.168.0.100/relay_cgi.cgi?type=0&relay=0&on=0&time=0&pwd=0
                string url = $"{_baseUrl}/relay_cgi.cgi?type=0&relay={relayNumber}&on=0&time=0&pwd=0";

                // HTTP GET 요청 보내기 (비동기)
                HttpResponseMessage response = await _httpClient.GetAsync(url);

                // 응답 성공 여부 체크 (HTTP 200~299)
                if (response.IsSuccessStatusCode)
                {
                    // 성공 메시지 출력
                    Console.WriteLine($"[SUCCESS] 릴레이 {relayNumber + 1}번 OFF");
                    return true;
                }
                else
                {
                    // HTTP 에러 코드 출력
                    Console.WriteLine($"[FAIL] 릴레이 {relayNumber + 1}번 OFF 실패 (HTTP {response.StatusCode})");
                    return false;
                }
            }
            catch (Exception ex)
            {
                // 네트워크 에러, 타임아웃 등 예외 처리
                Console.WriteLine($"[ERROR] 릴레이 {relayNumber + 1}번 OFF 에러: {ex.Message}");
                return false;
            }
        }
    }
}