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
        ConditionalGet.StampImmutable(Response, entityTag);
        if (ConditionalGet.IsNotModified(Request, entityTag))
            return StatusCode(StatusCodes.Status304NotModified);

        var blob = await store.GetByKeyAsync(k, ct);
        if (blob is null)
        {
            ConditionalGet.Unstamp(Response);
            return NotFound();
        }

        return File(blob.Data, blob.ContentType);
    }
}
