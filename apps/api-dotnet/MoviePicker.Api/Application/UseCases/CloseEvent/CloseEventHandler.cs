using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.CloseEvent;

public sealed class CloseEventHandler : ICloseEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public CloseEventHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task<CloseEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        if (evt.ClosedAt.HasValue)
        {
            return ToResponse(evt, "Soirée déjà clôturée");
        }

        var now = DateTimeOffset.UtcNow;
        var updated = new Event
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            CreatorUserId = evt.CreatorUserId,
            Config = evt.Config,
            ClosedAt = now,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt,
            UpdatedAt = now
        };

        var saved = await _eventRepository.UpdateAsync(updated, ct);
        return ToResponse(saved, "Soirée clôturée.");
    }

    private static CloseEventResponse ToResponse(Event e, string message) => new()
    {
        Id = e.Id,
        Title = e.Title,
        Date = e.Date,
        Time = e.Time,
        Slug = e.Slug,
        Config = EventConfigResponse.FromEvent(e),
        ClosedAt = e.ClosedAt,
        WinnerMovieId = e.WinnerMovieId,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        Message = message
    };
}
