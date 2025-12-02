using Microsoft.AspNetCore.Mvc;

namespace RelayWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RelayApiController : ControllerBase
    {
        private readonly RelayController _relayController;

        public RelayApiController()
        {
            // 릴레이 보드 IP 설정
            _relayController = new RelayController("192.168.0.100");
        }

        /// <summary>
        /// 릴레이 켜기
        /// </summary>
        /// <param name="relayNumber">릴레이 번호 (0~3)</param>
        [HttpPost("on/{relayNumber}")]
        public async Task<IActionResult> TurnOn(int relayNumber)
        {
            bool result = await _relayController.TurnOnAsync(relayNumber);

            if (result)
                return Ok(new { success = true, message = $"릴레이 {relayNumber + 1}번 ON" });
            else
                return BadRequest(new { success = false, message = $"릴레이 {relayNumber + 1}번 ON 실패" });
        }

        /// <summary>
        /// 릴레이 끄기
        /// </summary>
        /// <param name="relayNumber">릴레이 번호 (0~3)</param>
        [HttpPost("off/{relayNumber}")]
        public async Task<IActionResult> TurnOff(int relayNumber)
        {
            bool result = await _relayController.TurnOffAsync(relayNumber);

            if (result)
                return Ok(new { success = true, message = $"릴레이 {relayNumber + 1}번 OFF" });
            else
                return BadRequest(new { success = false, message = $"릴레이 {relayNumber + 1}번 OFF 실패" });
        }
    }
}