using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/letterboxd")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class LetterboxdController : ControllerBase
{
    [HttpPost("sync")]
    [EnableRateLimiting(RateLimitingExtensions.LetterboxdImportPolicy)]
    [ProducesResponseType(typeof(LetterboxdSyncResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Sync(
        [FromServices] ISyncLetterboxdWatchlistHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct,
        [FromQuery] bool force = false)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, force, ct);
        return Ok(result);
    }

    [HttpPost("confirm")]
    [EnableRateLimiting(RateLimitingExtensions.LetterboxdImportPolicy)]
    [ProducesResponseType(typeof(LetterboxdImportConfirmResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Confirm(
        [FromBody] LetterboxdImportConfirmRequest? request,
        [FromServices] IConfirmLetterboxdImportHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "Corps JSON requis."));
        }

        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, request, ct);
        return Ok(result);
    }
}
