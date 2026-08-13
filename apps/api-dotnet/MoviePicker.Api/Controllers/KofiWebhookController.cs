using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.UseCases.Donations;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/webhooks/kofi")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class KofiWebhookController : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.KofiWebhookPolicy)]
    [Consumes("application/x-www-form-urlencoded")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Receive(
        [FromForm] string? data,
        [FromServices] IProcessKofiWebhookHandler handler,
        CancellationToken ct)
    {
        var outcome = await handler.HandleAsync(data, ct);
        return outcome switch
        {
            KofiWebhookOutcome.NotConfigured => StatusCode(StatusCodes.Status503ServiceUnavailable),
            KofiWebhookOutcome.InvalidPayload => BadRequest(),
            KofiWebhookOutcome.InvalidToken => Unauthorized(),
            _ => Ok()
        };
    }
}
