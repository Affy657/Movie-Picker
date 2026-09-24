using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/scheduler")]
[RequestTimeout(RequestTimeoutPolicies.LongRunning)]
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
    [ProducesResponseType(typeof(EventReminderPassResult), StatusCodes.Status503ServiceUnavailable)]
    public Task<IActionResult> RunEventReminders(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IEventReminderPass pass,
        CancellationToken ct) =>
        RunPassAsync(authenticator, () => pass.RunAsync(ct), result => result.DeliveryFailures > 0, ct);

    [HttpPost("recurring-events")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(RecurringEventPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(RecurringEventPassResult), StatusCodes.Status503ServiceUnavailable)]
    public Task<IActionResult> RunRecurringEvents(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IRecurringEventPass pass,
        CancellationToken ct) =>
        RunPassAsync(authenticator, () => pass.RunAsync(ct), result => result.Failed > 0, ct);

    [HttpPost("finished-events")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(FinishedEventWatchlistPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(FinishedEventWatchlistPassResult), StatusCodes.Status503ServiceUnavailable)]
    public Task<IActionResult> RunFinishedEvents(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] IFinishedEventWatchlistPass pass,
        CancellationToken ct) =>
        RunPassAsync(authenticator, () => pass.RunAsync(ct), result => result.Failed > 0, ct);

    [HttpPost("warm-catalog")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.SchedulerPolicy)]
    [SharedRateLimit(RateLimitingExtensions.SchedulerPolicy)]
    [ProducesResponseType(typeof(CatalogWarmPassResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(CatalogWarmPassResult), StatusCodes.Status503ServiceUnavailable)]
    public Task<IActionResult> RunCatalogWarmUp(
        [FromServices] ISchedulerCallerAuthenticator authenticator,
        [FromServices] ICatalogWarmPass pass,
        CancellationToken ct) =>
        RunPassAsync(authenticator, () => pass.RunAsync(ct), result => result.Failed > 0, ct);

    private async Task<IActionResult> RunPassAsync<TResult>(
        ISchedulerCallerAuthenticator authenticator,
        Func<Task<TResult>> run,
        Func<TResult, bool> failed,
        CancellationToken ct)
    {
        var verdict = await authenticator.AuthenticateAsync(PresentedCredentials(), ct);
        if (verdict == SchedulerCallerVerdict.NotConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (verdict != SchedulerCallerVerdict.Accepted)
            return Unauthorized();

        var result = await run();
        return failed(result) ? StatusCode(StatusCodes.Status503ServiceUnavailable, result) : Ok(result);
    }

    private const string BearerPrefix = "Bearer ";

    private SchedulerCallerCredentials PresentedCredentials()
    {
        var authorization = Request.Headers[HeaderNames.Authorization].ToString();
        var bearer = authorization.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase)
            ? authorization[BearerPrefix.Length..]
            : null;
        return new SchedulerCallerCredentials(string.IsNullOrWhiteSpace(bearer) ? null : bearer);
    }
}
