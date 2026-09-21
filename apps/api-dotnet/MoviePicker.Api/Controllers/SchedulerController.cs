using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
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
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(EventReminderPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RunEventReminders(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IEventReminderPass pass,
        CancellationToken ct)
    {
        var verdict = await authenticator.AuthenticateAsync(PresentedCredentials(), ct);
        if (verdict == SchedulerCallerVerdict.NotConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (verdict != SchedulerCallerVerdict.Accepted)
            return Unauthorized();

        var result = await pass.RunAsync(ct);
        return Ok(result);
    }

    [HttpPost("recurring-events")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(RecurringEventPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RunRecurringEvents(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IRecurringEventPass pass,
        CancellationToken ct)
    {
        var verdict = await authenticator.AuthenticateAsync(PresentedCredentials(), ct);
        if (verdict == SchedulerCallerVerdict.NotConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (verdict != SchedulerCallerVerdict.Accepted)
            return Unauthorized();

        var result = await pass.RunAsync(ct);
        return Ok(result);
    }

    [HttpPost("finished-events")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(FinishedEventWatchlistPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RunFinishedEvents(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IFinishedEventWatchlistPass pass,
        CancellationToken ct)
    {
        var verdict = await authenticator.AuthenticateAsync(PresentedCredentials(), ct);
        if (verdict == SchedulerCallerVerdict.NotConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (verdict != SchedulerCallerVerdict.Accepted)
            return Unauthorized();

        var result = await pass.RunAsync(ct);
        return Ok(result);
    }

    [HttpPost("rating-reminders")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(RatingReminderPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RunRatingReminders(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IRatingReminderPass pass,
        CancellationToken ct)
    {
        var verdict = await authenticator.AuthenticateAsync(PresentedCredentials(), ct);
        if (verdict == SchedulerCallerVerdict.NotConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (verdict != SchedulerCallerVerdict.Accepted)
            return Unauthorized();

        var result = await pass.RunAsync(ct);
        return Ok(result);
    }

    private const string SharedTokenHeader = "X-Scheduler-Token";
    private const string BearerPrefix = "Bearer ";

    private SchedulerCallerCredentials PresentedCredentials()
    {
        var shared = Request.Headers[SharedTokenHeader].ToString();
        var authorization = Request.Headers[HeaderNames.Authorization].ToString();
        var bearer = authorization.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase)
            ? authorization[BearerPrefix.Length..]
            : null;
        return new SchedulerCallerCredentials(
            string.IsNullOrWhiteSpace(shared) ? null : shared,
            string.IsNullOrWhiteSpace(bearer) ? null : bearer);
    }
}
