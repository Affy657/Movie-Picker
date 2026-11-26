using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("")]
public sealed class RobotsController : ControllerBase
{
    private static readonly string[] CrawlableApiPrefixes = ["posters", "banners", "avatars", "movies", "users", "recaps"];

    private static readonly string Rules =
        "User-agent: *\n"
        + string.Concat(CrawlableApiPrefixes.Select(prefix => $"Allow: /{ApiRoutePrefix.V1}/{prefix}/\n"))
        + $"Disallow: /{ApiRoutePrefix.V1}/users/me/\n"
        + "Disallow: /\n";

    [HttpGet("robots.txt")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [Produces("text/plain")]
    public IActionResult Get()
    {
        Response.Headers.CacheControl = "public, max-age=86400";
        return Content(Rules, "text/plain; charset=utf-8");
    }
}
