using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/movies")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class MoviesShowcaseController : ControllerBase
{
    [HttpGet("showcase")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.MovieShowcasePolicy)]
    [ProducesResponseType(typeof(MovieShowcaseListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetShowcase(
        [FromQuery] string? section,
        [FromQuery] string? theme,
        [FromQuery] string? genreIds,
        [FromQuery] int? collectionId,
        [FromQuery] string? provider,
        [FromQuery] int? seedTmdbId,
        [FromServices] IGetMovieShowcaseHandler handler,
        CancellationToken ct)
    {
        var query = new MovieShowcaseQuery(
            section ?? MovieShowcaseSections.Trending,
            theme,
            ParseGenreIds(genreIds),
            collectionId,
            provider,
            seedTmdbId);
        var result = await handler.HandleAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("collections")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.MovieShowcasePolicy)]
    [ProducesResponseType(typeof(MovieCollectionListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetCollections(
        [FromServices] IGetMovieCollectionsHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(ct);
        return Ok(result);
    }

    private static List<int> ParseGenreIds(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return [];
        var ids = new List<int>();
        foreach (var part in raw.Split(','))
        {
            if (int.TryParse(part.Trim(), out var id) && id > 0)
                ids.Add(id);
        }
        return ids;
    }
}
