using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
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
    public async Task<IActionResult> Get(string key, [FromServices] IAvatarPhotoRepository photos, CancellationToken ct)
    {
        if (!AvatarPhoto.IsValidKey(key))
            return NotFound();

        var photo = await photos.GetByKeyAsync(key, ct);
        if (photo is null)
        {
            ConditionalGet.Unstamp(Response);
            return NotFound();
        }

        var entityTag = $"\"{key}\"";
        ConditionalGet.StampImmutable(Response, entityTag);
        return ConditionalGet.IsNotModified(Request, entityTag)
            ? StatusCode(StatusCodes.Status304NotModified)
            : File(photo.Data, photo.ContentType);
    }
}
