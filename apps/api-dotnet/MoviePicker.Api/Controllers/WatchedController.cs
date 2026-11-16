using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watched;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/watched")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class WatchedController : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.WatchedMutationPolicy)]
    [ProducesResponseType(typeof(WatchedStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Mark(
        [FromBody] MarkWatchedRequest request,
        [FromServices] IMarkWatchedHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, request, ct));
    }

    [HttpGet("{tmdbId:int}")]
    [EnableRateLimiting(RateLimitingExtensions.WatchedReadPolicy)]
    [ProducesResponseType(typeof(WatchedStatusResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(
        int tmdbId,
        [FromServices] IGetWatchedStatusHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct,
        [FromQuery] MovieMediaType mediaType = MovieMediaType.Movie)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, tmdbId, mediaType, ct));
    }

    [HttpPut("{tmdbId:int}/rating")]
    [EnableRateLimiting(RateLimitingExtensions.WatchedMutationPolicy)]
    [ProducesResponseType(typeof(WatchedStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetRating(
        int tmdbId,
        [FromBody] SetWatchedRatingRequest request,
        [FromServices] ISetWatchedRatingHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct,
        [FromQuery] MovieMediaType mediaType = MovieMediaType.Movie)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, tmdbId, mediaType, request.Value, ct));
    }

    [HttpDelete("{tmdbId:int}")]
    [EnableRateLimiting(RateLimitingExtensions.WatchedMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Unmark(
        int tmdbId,
        [FromServices] IUnmarkWatchedHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct,
        [FromQuery] MovieMediaType mediaType = MovieMediaType.Movie)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, tmdbId, mediaType, ct);
        return NoContent();
    }
}
