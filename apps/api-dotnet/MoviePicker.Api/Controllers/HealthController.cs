using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Contracts;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route("health")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(HealthOkResponse), StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new HealthOkResponse("ok", "movie-picker-api"));
}
