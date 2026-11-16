using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/events/{idOrSlug}")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class EventLiveController : ControllerBase
{
    private const string StreamRetryAfterSeconds = "30";

    [HttpGet("stream")]
    [AllowAnonymous]
    [DisableRequestTimeout]
    [EnableRateLimiting(RateLimitingExtensions.EventStreamPolicy)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, EventStreamResult.ContentType)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Stream(
        string idOrSlug,
        [FromServices] IOpenEventStreamHandler handler,
        [FromServices] IEventLiveFeed feed,
        [FromServices] IOptions<EventLiveOptions> options,
        [FromServices] EventStreamGate gate,
        CancellationToken ct)
    {
        var access = await handler.HandleAsync(idOrSlug, ct);
        if (!gate.TryEnter(HttpContext, out var lease))
        {
            Response.Headers.RetryAfter = StreamRetryAfterSeconds;
            return StatusCode(StatusCodes.Status429TooManyRequests);
        }
        return new EventStreamResult(access, feed, options.Value, lease);
    }

    [HttpPut("presence")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.EventPresencePolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SetPresence(
        string idOrSlug,
        [FromBody] PresenceRequest request,
        [FromServices] ISetPresenceHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, request, ct);
        return NoContent();
    }
}
