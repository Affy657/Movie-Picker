using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.UseCases.EventRecap;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("r")]
public sealed class EventRecapController : ControllerBase
{
    [HttpGet("{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.RecapDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.RecapDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> Get(
        string slug,
        [FromServices] IGetEventRecapDocumentHandler handler,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, this.PublicApiBase(), ct));
}
