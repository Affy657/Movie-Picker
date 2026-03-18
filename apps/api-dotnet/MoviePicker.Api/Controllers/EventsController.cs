using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route("events")]
public sealed class EventsController : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(CreateEventResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateEventRequest request,
        [FromServices] ICreateEventHandler handler,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "title requis" });
        if (string.IsNullOrWhiteSpace(request.Date) || string.IsNullOrWhiteSpace(request.Time))
            return BadRequest(new { error = "date et time requis" });

        var result = await handler.HandleAsync(request, ct);
        return CreatedAtAction(nameof(GetBySlug), new { idOrSlug = result.Slug }, result);
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
    [ProducesResponseType(typeof(ParticipantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(JoinEventResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Join(
        string idOrSlug,
        [FromBody] JoinEventRequest request,
        [FromServices] IJoinEventHandler handler,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Pseudo))
            return BadRequest(new { error = "pseudo requis" });

        var result = await handler.HandleAsync(idOrSlug, request, ct);

        if (result.IsNew)
            return Created(string.Empty, result.Participant);

        return Ok(new { participant = result.Participant, message = result.Message });
    }

    [HttpPost("{idOrSlug}/wheel")]
    [ProducesResponseType(typeof(WheelResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
