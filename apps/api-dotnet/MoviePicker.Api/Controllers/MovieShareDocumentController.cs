using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.UseCases.MovieShare;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("")]
public sealed class MovieShareDocumentController : ControllerBase
{
    [HttpGet("film/{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.MovieDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.MovieDocumentCeilingPolicy)]
    [SharedRateLimit(RateLimitingExtensions.MovieDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> GetFilm(
        string slug,
        [FromServices] IGetMovieShareDocumentHandler handler,
        [FromServices] IOptions<MoviePickerOptions> options,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, MovieMediaType.Movie, options.Value.ResolvedApiBaseUrl(), ct));

    [HttpGet("serie/{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.MovieDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.MovieDocumentCeilingPolicy)]
    [SharedRateLimit(RateLimitingExtensions.MovieDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> GetSeries(
        string slug,
        [FromServices] IGetMovieShareDocumentHandler handler,
        [FromServices] IOptions<MoviePickerOptions> options,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, MovieMediaType.Tv, options.Value.ResolvedApiBaseUrl(), ct));
}
