using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.UseCases.EventRecap;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public sealed class EventRecapController : ControllerBase
{
    [HttpGet("/r/{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.RecapDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.RecapDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> Get(
        string slug,
        [FromServices] IGetEventRecapDocumentHandler handler,
        CancellationToken ct)
    {
        var apiBase = $"{Request.Scheme}://{Request.Host.Value}{Request.PathBase.Value}";
        var document = await handler.HandleAsync(slug, apiBase, ct);
        Response.Headers.CacheControl = "public, max-age=60";
        Response.Headers.ContentSecurityPolicy = "frame-ancestors 'none'";
        Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        return new ContentResult
        {
            StatusCode = document.StatusCode,
            ContentType = "text/html; charset=utf-8",
            Content = document.Html
        };
    }
}
