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
    private const string Rules =
        "User-agent: *\n"
        + "Allow: /" + ApiRoutePrefix.V1 + "/posters/\n"
        + "Allow: /" + ApiRoutePrefix.V1 + "/banners/\n"
        + "Allow: /" + ApiRoutePrefix.V1 + "/avatars/\n"
        + "Allow: /" + ApiRoutePrefix.V1 + "/movies/\n"
        + "Allow: /" + ApiRoutePrefix.V1 + "/users/\n"
        + "Allow: /" + ApiRoutePrefix.V1 + "/recaps/\n"
        + "Disallow: /" + ApiRoutePrefix.V1 + "/users/me/\n"
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
