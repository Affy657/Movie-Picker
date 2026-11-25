using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.UseCases.EventInvitation;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("e")]
public sealed class EventInvitationController : ControllerBase
{
    [HttpGet("{slug}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.InvitationDocumentPolicy)]
    [SharedRateLimit(RateLimitingExtensions.InvitationDocumentPolicy)]
    [Produces("text/html")]
    public async Task<IActionResult> Get(
        string slug,
        [FromServices] IGetEventInvitationDocumentHandler handler,
        [FromServices] IOptions<MoviePickerOptions> options,
        CancellationToken ct) =>
        this.ShareDocument(await handler.HandleAsync(slug, options.Value.ResolvedApiBaseUrl(), ct));
}
