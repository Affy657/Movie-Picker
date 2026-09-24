using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/posters")]
public sealed class PostersController : ControllerBase
{
    [HttpGet("{posterKey}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PostersPolicy)]
    [Produces("image/jpeg", "image/png", "image/webp")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string posterKey, [FromServices] IPosterImageStore store, CancellationToken ct)
    {
        var k = posterKey.ToLowerInvariant();
        if (!TmdbPosterUrlNormalizer.IsValidPosterKey(k))
            return NotFound();

        return await ServeAsync(k, () => store.GetByKeyAsync(k, ct));
    }

    [HttpGet("tmdb/{size}/{file}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PostersPolicy)]
    [Produces("image/jpeg", "image/png", "image/webp")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTmdb(
        string size,
        string file,
        [FromServices] IPosterImageStore store,
        [FromServices] IOptions<MoviePickerOptions> options,
        CancellationToken ct)
    {
        if (!TmdbPosterUrlNormalizer.TryResolveTmdbRoute(size, file, out var source))
            return NotFound();

        if (!options.Value.PosterCacheEnabled)
        {
            Response.Headers.CacheControl = "public,max-age=86400";
            return Redirect(source);
        }

        return await ServeAsync(TmdbPosterUrlNormalizer.ComputeKey(source), () => store.GetOrFetchAsync(source, ct));
    }

    private async Task<IActionResult> ServeAsync(string key, Func<Task<PosterImageBlob?>> load)
    {
        var entityTag = $"\"{key}\"";
        if (Request.Headers.IfNoneMatch.Contains(entityTag))
        {
            MarkImmutable(entityTag);
            return StatusCode(StatusCodes.Status304NotModified);
        }

        var blob = await load();
        if (blob is null)
        {
            Response.Headers.CacheControl = "no-store";
            return NotFound();
        }

        MarkImmutable(entityTag);
        return File(blob.Data, blob.ContentType);
    }

    private void MarkImmutable(string entityTag)
    {
        Response.Headers.CacheControl = "public,max-age=86400,immutable";
        Response.Headers.ETag = entityTag;
    }
}
