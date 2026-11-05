using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.NightRecap;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/recaps")]
public sealed class RecapsController : ControllerBase
{
    [HttpGet("{recapSlug}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(NightRecapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        string recapSlug,
        [FromServices] IGetNightRecapHandler handler,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(recapSlug, ct));
}
