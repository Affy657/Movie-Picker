using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.UseCases.ProfileShare;
using MoviePicker.Api.Configuration;
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
        [FromServices] IOptions<MoviePickerOptions> options,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, options.Value.ResolvedApiBaseUrl(), ct));
}
