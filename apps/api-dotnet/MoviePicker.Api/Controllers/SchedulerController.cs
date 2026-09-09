using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/scheduler")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class SchedulerController : ControllerBase
{
    [HttpPost("event-reminders")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(EventReminderPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RunEventReminders(
        [FromServices] ISchedulerTokenValidator tokenValidator,
        [FromServices] IEventReminderPass pass,
        [FromHeader(Name = "X-Scheduler-Token")] string? schedulerToken,
        CancellationToken ct)
    {
        if (!tokenValidator.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (!tokenValidator.IsValid(schedulerToken))
            return Unauthorized();

        var result = await pass.RunAsync(ct);
        return Ok(result);
    }
}
