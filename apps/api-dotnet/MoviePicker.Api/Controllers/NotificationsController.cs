using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/notifications")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class NotificationsController : ControllerBase
{
    [HttpGet("vapid-public-key")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public IActionResult GetVapidPublicKey([FromServices] IOptions<MoviePickerOptions> options)
    {
        return Ok(new { publicKey = options.Value.VapidPublicKey ?? string.Empty });
    }

    [HttpPost("subscriptions")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Subscribe(
        [FromBody] SubscribePushRequest request,
        [FromServices] ISubscribePushHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, request, ct);
        return NoContent();
    }

    [HttpDelete("subscriptions")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Unsubscribe(
        [FromBody] UnsubscribePushRequest request,
        [FromServices] IUnsubscribePushHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, request.Endpoint, ct);
        return NoContent();
    }

    [HttpGet("preferences")]
    [Authorize]
    [ProducesResponseType(typeof(NotificationPreferencesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPreferences(
        [FromServices] IGetNotificationPreferencesHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, ct);
        return Ok(result);
    }

    [HttpPatch("preferences")]
    [Authorize]
    [ProducesResponseType(typeof(NotificationPreferencesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PatchPreferences(
        [FromBody] PatchNotificationPreferencesRequest request,
        [FromServices] IPatchNotificationPreferencesHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, request, ct);
        return Ok(result);
    }

    [HttpGet("inbox")]
    [Authorize]
    [ProducesResponseType(typeof(NotificationInboxResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetInbox(
        [FromServices] IGetInboxHandler handler,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, limit, offset, ct);
        return Ok(result);
    }

    [HttpPost("inbox/read-all")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkAllRead(
        [FromServices] IMarkAllReadHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, ct);
        return NoContent();
    }

    [HttpPost("inbox/{id}/read")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkOneRead(
        string id,
        [FromServices] IMarkOneReadHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }
}
