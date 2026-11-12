using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieNights;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/movies")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class MovieNightsController : ControllerBase
{
    [HttpGet("tmdb/{tmdbId:int}/nights")]
    [EnableRateLimiting(RateLimitingExtensions.MovieDetailsPolicy)]
    [ProducesResponseType(typeof(MovieNightsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Get(
        int tmdbId,
        [FromQuery] MovieMediaType mediaType,
        [FromServices] IGetMovieNightsHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, tmdbId, mediaType, ct));
    }
}
