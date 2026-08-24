using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.UseCases.Sitemap;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route("/")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class SitemapController : ControllerBase
{
    [HttpGet("sitemap.xml")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [Produces("application/xml")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetSitemap(
        [FromServices] IGetSitemapXmlHandler handler,
        CancellationToken ct)
    {
        var xml = await handler.BuildXmlAsync(ct);
        Response.Headers.CacheControl = "public, max-age=3600";
        return Content(xml, "application/xml; charset=utf-8");
    }
}
