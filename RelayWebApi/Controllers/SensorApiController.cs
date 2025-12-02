using Microsoft.AspNetCore.Mvc;
using RelayWebApi.Services;

namespace RelayWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SensorApiController : ControllerBase
    {
        private readonly SensorDataService _dataService;

        public SensorApiController(SensorDataService dataService)
        {
            _dataService = dataService;
        }

        /// <summary>
        /// 센서 데이터 조회
        /// GET /api/sensor/data
        /// </summary>
        [HttpGet("data")]
        public IActionResult GetSensorData()
        {
            return Ok(new
            {
                sentrionTemp = _dataService.SentrionTemp,
                sentrionHumidity = _dataService.SentrionHumidity,
                ecTemp = _dataService.EcTemp,
                ecHumidity = _dataService.EcHumidity,
                h2s = _dataService.H2S,
                relay3Status = _dataService.Relay3Status,
                relay4Status = _dataService.Relay4Status,
                lastUpdated = _dataService.LastUpdated
            });
        }
    }
}