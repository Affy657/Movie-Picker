using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
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

        var entityTag = $"\"{k}\"";
        Response.Headers.CacheControl = "public,max-age=86400,immutable";
        Response.Headers.ETag = entityTag;

        if (Request.Headers.IfNoneMatch.Contains(entityTag))
            return StatusCode(StatusCodes.Status304NotModified);

        var blob = await store.GetByKeyAsync(k, ct);
        if (blob is null)
        {
            Response.Headers.Remove("Cache-Control");
            Response.Headers.Remove("ETag");
            return NotFound();
        }

        return File(blob.Data, blob.ContentType);
    }
}
