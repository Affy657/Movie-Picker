using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/watchlist")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class WatchlistController : ControllerBase
{
    [HttpGet]
    [EnableRateLimiting(RateLimitingExtensions.WatchlistReadPolicy)]
    [ProducesResponseType(typeof(WatchlistResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Get(
        [FromServices] IGetWatchlistHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, ct);
        return Ok(result);
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.WatchlistMutationPolicy)]
    [ProducesResponseType(typeof(WatchlistItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Add(
        [FromBody] AddWatchlistItemRequest request,
        [FromServices] IAddToWatchlistHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var item = await handler.HandleAsync(userId, request, ct);
        return Created(string.Empty, item);
    }

    [HttpDelete("{tmdbId:int}")]
    [EnableRateLimiting(RateLimitingExtensions.WatchlistMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Remove(
        int tmdbId,
        [FromServices] IRemoveFromWatchlistHandler handler,
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
