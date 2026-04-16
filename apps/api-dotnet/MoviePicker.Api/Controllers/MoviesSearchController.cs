using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.GetMovieDetails;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/movies")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class MoviesSearchController : ControllerBase
{
    [HttpGet("search")]
    [EnableRateLimiting(RateLimitingExtensions.SearchMoviesPolicy)]
    [ProducesResponseType(typeof(MovieSearchListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromServices] ISearchMoviesHandler handler,
        CancellationToken ct)
    {
        var results = await handler.HandleAsync(q ?? string.Empty, ct);
        return Ok(results);
    }

    [HttpGet("tmdb/{tmdbId:int}/details")]
    [EnableRateLimiting(RateLimitingExtensions.MovieDetailsPolicy)]
    [ProducesResponseType(typeof(MovieDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetDetails(
        int tmdbId,
        [FromServices] IGetMovieDetailsHandler handler,
        CancellationToken ct)
    {
        var details = await handler.HandleAsync(tmdbId, ct);
        if (details is null)
            return NotFound();
        return Ok(details);
    }
}
