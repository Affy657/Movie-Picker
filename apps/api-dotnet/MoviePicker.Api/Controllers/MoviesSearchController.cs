using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieDetails;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Domain.Entities;
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
        [FromQuery] string? eventSlug,
        [FromQuery] string? genreIds,
        [FromQuery] int? yearFrom,
        [FromQuery] int? yearTo,
        [FromQuery] double? voteMin,
        [FromQuery] string? language,
        [FromQuery] int? runtimeMin,
        [FromQuery] int? runtimeMax,
        [FromServices] ISearchMoviesHandler handler,
        [FromServices] IEventRepository eventRepository,
        CancellationToken ct)
    {
        bool allowSeries = false;
        if (!string.IsNullOrWhiteSpace(eventSlug))
        {
            try
            {
                var evt = await eventRepository.GetRequiredByIdOrSlugAsync(eventSlug, ct);
                allowSeries = evt.Config?.AllowSeries ?? false;
            }
            catch
            {
                allowSeries = false;
            }
        }

        var parsedGenreIds = ParseGenreIds(genreIds);
        MovieSearchFilters? filters = null;
        if (parsedGenreIds.Count > 0 || yearFrom.HasValue || yearTo.HasValue || voteMin.HasValue
            || !string.IsNullOrWhiteSpace(language) || runtimeMin.HasValue || runtimeMax.HasValue)
            filters = new MovieSearchFilters(
                parsedGenreIds, yearFrom, yearTo, voteMin, language?.Trim().ToLowerInvariant(), runtimeMin, runtimeMax);

        var results = await handler.HandleAsync(q ?? string.Empty, allowSeries, filters, ct);
        return Ok(results);
    }

    private static IReadOnlyList<int> ParseGenreIds(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        var ids = new List<int>();
        foreach (var part in raw.Split(','))
        {
            if (int.TryParse(part.Trim(), out var id) && id > 0)
                ids.Add(id);
        }
        return ids;
    }

    [HttpGet("tmdb/{tmdbId:int}/details")]
    [EnableRateLimiting(RateLimitingExtensions.MovieDetailsPolicy)]
    [ProducesResponseType(typeof(MovieDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetDetails(
        int tmdbId,
        [FromQuery] MovieMediaType mediaType,
        [FromServices] IGetMovieDetailsHandler handler,
        CancellationToken ct)
    {
        var details = await handler.HandleAsync(tmdbId, mediaType, ct);
        if (details is null)
            return NotFound();
        return Ok(details);
    }
}
