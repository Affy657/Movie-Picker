using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Contracts;

namespace MoviePicker.Api.Controllers;

[ApiController]
public sealed class HealthController : ControllerBase
{
    [HttpGet("health")]
    [ProducesResponseType(typeof(HealthOkResponse), StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new HealthOkResponse("ok", "movie-picker-api"));
}
