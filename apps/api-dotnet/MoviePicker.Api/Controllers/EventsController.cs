using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/events")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class EventsController : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.CreateEventPolicy)]
    [ProducesResponseType(typeof(CreateEventResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Create(
        [FromBody] CreateEventRequest request,
        [FromServices] ICreateEventHandler handler,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "title requis" });
        if (string.IsNullOrWhiteSpace(request.Date) || string.IsNullOrWhiteSpace(request.Time))
            return BadRequest(new { error = "date et time requis" });

        var creatorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await handler.HandleAsync(
            request,
            string.IsNullOrEmpty(creatorUserId) ? null : creatorUserId,
            ct);
        return CreatedAtAction(nameof(GetBySlug), new { idOrSlug = result.Slug }, result);
    }

    [HttpGet("mine")]
    [Authorize]
    [ProducesResponseType(typeof(MyEventsListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListMine(
        [FromServices] IListMyEventsHandler handler,
        [FromQuery] int? limit,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, limit, ct);
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
        if (request is null)
            return BadRequest(new { error = "corps requis" });
        var result = await handler.HandleAsync(idOrSlug, request, ct);
        return Ok(result);
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

    [HttpGet("{idOrSlug}")]
    [ProducesResponseType(typeof(EventDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByIdOrSlug(
        string idOrSlug,
        [FromServices] IGetEventDetailHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPost("{idOrSlug}/join")]
    [EnableRateLimiting(RateLimitingExtensions.JoinEventPolicy)]
    [ProducesResponseType(typeof(ParticipantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(JoinEventResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Join(
        string idOrSlug,
        [FromBody] JoinEventRequest request,
        [FromServices] IJoinEventHandler handler,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Pseudo))
            return BadRequest(new { error = "pseudo requis" });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await handler.HandleAsync(
            idOrSlug,
            request,
            string.IsNullOrEmpty(userId) ? null : userId,
            ct);

        if (result.IsNew)
            return Created(string.Empty, result.Participant);

        return Ok(new { participant = result.Participant, message = result.Message });
    }

    [HttpPost("{idOrSlug}/wheel")]
    [ProducesResponseType(typeof(WheelResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Wheel(
        string idOrSlug,
        [FromServices] ILaunchWheelHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }

    [HttpPost("{idOrSlug}/close")]
    [ProducesResponseType(typeof(CloseEventResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Close(
        string idOrSlug,
        [FromServices] ICloseEventHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(idOrSlug, ct);
        return Ok(result);
    }
}
