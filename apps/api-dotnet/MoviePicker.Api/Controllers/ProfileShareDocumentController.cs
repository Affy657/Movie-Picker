using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.UseCases.ProfileShare;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("")]
public sealed class ProfileShareDocumentController : ControllerBase
{
    [HttpGet("u/{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.ProfileDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.ProfileDocumentCeilingPolicy)]
    [SharedRateLimit(RateLimitingExtensions.ProfileDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> GetProfile(
        string slug,
        [FromServices] IGetProfileShareDocumentHandler handler,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, this.PublicApiBase(), ct));
}
