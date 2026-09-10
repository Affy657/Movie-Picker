using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteEvent;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Application.UseCases.EventSharePreview;
using MoviePicker.Api.Application.UseCases.GetEligibleFollowsForEvent;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.InviteUser;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Application.UseCases.RemoveParticipant;
using MoviePicker.Api.Application.UseCases.ResetWheel;
using MoviePicker.Api.Application.UseCases.SetManualWinner;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/events")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class EventsController : ControllerBase
{
    [HttpPost]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.CreateEventPolicy)]
    [ProducesResponseType(typeof(CreateEventResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Create(
        [FromBody] CreateEventRequest request,
        [FromServices] ICreateEventHandler handler,
        CancellationToken ct)
    {
        var creatorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(creatorUserId))
            return Unauthorized();

        var result = await handler.HandleAsync(request, creatorUserId, ct);
        return CreatedAtAction(nameof(GetBySlug), new { idOrSlug = result.Slug }, result);
    }

    [HttpGet("mine")]
    [Authorize]
    [ProducesResponseType(typeof(MyEventsListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListMine(
        [FromServices] IListMyEventsHandler handler,
        [FromQuery] string? scope,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, scope, limit, offset, q, ct);
        return Ok(result);
    }

    [HttpGet("{idOrSlug}/config")]
    [ProducesResponseType(typeof(EventConfigResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetConfig(
        string idOrSlug,
        [FromServices] IGetEventConfigHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPatch("{idOrSlug}/config")]
    [EnableRateLimiting(RateLimitingExtensions.PatchEventConfigPolicy)]
    [ProducesResponseType(typeof(EventConfigResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> PatchConfig(
        string idOrSlug,
        [FromBody] PatchEventConfigRequest request,
        [FromServices] IPatchEventConfigHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, request, ct);
        return Ok(result);
    }

    [HttpGet("slug/{idOrSlug}/share-preview")]
    [Produces("text/html")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSharePreview(
        string idOrSlug,
        [FromServices] IGetEventSharePreviewHtmlHandler handler,
        CancellationToken ct)
    {
        var apiBase = $"{Request.Scheme}://{Request.Host.Value}{Request.PathBase.Value}";
        var html = await handler.BuildHtmlAsync(idOrSlug, apiBase, ct);
        Response.Headers.CacheControl = "public, max-age=120";
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpGet("slug/{idOrSlug}")]
    [ProducesResponseType(typeof(EventDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBySlug(
        string idOrSlug,
        [FromServices] IGetEventDetailHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPost("{idOrSlug}/join")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.JoinEventPolicy)]
    [ProducesResponseType(typeof(JoinEventResult), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(JoinEventResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Join(
        string idOrSlug,
        [FromBody] JoinEventRequest request,
        [FromServices] IJoinEventHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(idOrSlug, request, userId, ct);

        if (result.IsNew)
            return Created(string.Empty, result);

        return Ok(result);
    }

    [HttpPost("{idOrSlug}/wheel")]
    [ProducesResponseType(typeof(WheelResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<IActionResult> Wheel(
        string idOrSlug,
        [FromBody] CsrfGuardRequest _,
        [FromServices] ILaunchWheelHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPost("{idOrSlug}/wheel/announce")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<IActionResult> AnnounceWheelWinner(
        string idOrSlug,
        [FromBody] CsrfGuardRequest _,
        [FromServices] IAnnounceWheelWinnerHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, ct);
        return NoContent();
    }

    [HttpPost("{idOrSlug}/winner")]
    [ProducesResponseType(typeof(WheelResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<IActionResult> SetManualWinner(
        string idOrSlug,
        [FromBody] SetManualWinnerRequest request,
        [FromServices] ISetManualWinnerHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, request, ct);
        return Ok(result);
    }

    [HttpDelete("{idOrSlug}/wheel")]
    [ProducesResponseType(typeof(ResetWheelResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ResetWheel(
        string idOrSlug,
        [FromServices] IResetWheelHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPost("{idOrSlug}/close")]
    [ProducesResponseType(typeof(CloseEventResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<IActionResult> Close(
        string idOrSlug,
        [FromBody] CsrfGuardRequest _,
        [FromServices] ICloseEventHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpDelete("{idOrSlug}/participants/{participantId}")]
    [EnableRateLimiting(RateLimitingExtensions.RemoveParticipantPolicy)]
    [ProducesResponseType(typeof(RemoveParticipantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RemoveParticipant(
        string idOrSlug,
        string participantId,
        [FromServices] IRemoveParticipantHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, participantId, ct);
        return Ok(result);
    }

    [HttpGet("{idOrSlug}/invitations/eligible-follows")]
    [Authorize]
    [ProducesResponseType(typeof(EligibleFollowsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEligibleFollows(
        string idOrSlug,
        [FromServices] IGetEligibleFollowsForEventHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPost("{idOrSlug}/invitations")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.InviteUserPolicy)]
    [ProducesResponseType(typeof(InviteUserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SendInvitation(
        string idOrSlug,
        [FromBody] InviteUserRequest request,
        [FromServices] IInviteUserHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(idOrSlug, request, ct);
        return Created(string.Empty, result);
    }

    [HttpDelete("{idOrSlug}")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.DeleteEventPolicy)]
    [ProducesResponseType(typeof(DeleteEventResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Delete(
        string idOrSlug,
        [FromServices] IDeleteEventHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }
}
