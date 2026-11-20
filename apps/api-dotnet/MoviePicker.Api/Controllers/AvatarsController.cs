using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/avatars")]
public sealed class AvatarsController : ControllerBase
{
    [HttpGet("{key}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AvatarPhotosPolicy)]
    [Produces("image/jpeg", "image/png", "image/webp")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> Get(string key, [FromServices] IAvatarPhotoRepository photos, CancellationToken ct) =>
        PhotoBlobEndpoint.ServeAsync(this, key, photos, ct);
}
