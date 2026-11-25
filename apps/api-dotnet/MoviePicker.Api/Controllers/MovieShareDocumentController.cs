using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieShare;
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
        [FromQuery] string? lang,
        [FromServices] IGetMovieShareDocumentHandler handler,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, MovieMediaType.Movie, this.PublicApiBase(), DocumentLanguage(lang), ct));

    [HttpGet("serie/{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.MovieDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.MovieDocumentCeilingPolicy)]
    [SharedRateLimit(RateLimitingExtensions.MovieDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> GetSeries(
        string slug,
        [FromQuery] string? lang,
        [FromServices] IGetMovieShareDocumentHandler handler,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, MovieMediaType.Tv, this.PublicApiBase(), DocumentLanguage(lang), ct));

    private static CatalogLanguage DocumentLanguage(string? lang) =>
        CatalogLanguages.FromTag(lang) ?? CatalogLanguage.French;
}
