using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/letterboxd")]
[RequestTimeout(RequestTimeoutPolicies.LongRunning)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class LetterboxdController : ControllerBase
{
    [HttpPost("sync")]
    [EnableRateLimiting(RateLimitingExtensions.LetterboxdImportPolicy)]
    [SharedRateLimit(RateLimitingExtensions.LetterboxdImportPolicy)]
    [ProducesResponseType(typeof(LetterboxdSyncResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Sync(
        [FromServices] ISyncLetterboxdWatchlistHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct,
        [FromQuery] bool force = false)
    {
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
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "JSON body required", ErrorCodes.ValidationFailed));
        }

        var result = await handler.HandleAsync(userId, request, ct);
        return Ok(result);
    }

    [HttpPost("export/read")]
    [RequestSizeLimit(RequestBodyLimits.AttachmentsBytes)]
    [EnableRateLimiting(RateLimitingExtensions.LetterboxdImportPolicy)]
    [ProducesResponseType(typeof(LetterboxdExportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public IActionResult ReadExport(
        [FromBody] LetterboxdExportReadRequest request,
        [FromServices] IReadLetterboxdExportHandler handler) =>
        Ok(handler.Handle(request));

    [HttpPost("export/import")]
    [EnableRateLimiting(RateLimitingExtensions.LetterboxdExportImportPolicy)]
    [ProducesResponseType(typeof(LetterboxdExportImportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ImportExport(
        [FromBody] LetterboxdExportImportRequest request,
        [FromServices] IImportLetterboxdExportHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(userId, request, ct));
}
