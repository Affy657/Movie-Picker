using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.CloseEvent;

public sealed class CloseEventHandler : ICloseEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;

    public CloseEventHandler(IEventRepository eventRepository, IHostTokenAccessor hostTokenAccessor)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
    }

    public async Task<CloseEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        var token = _hostTokenAccessor.GetHostToken();
        if (string.IsNullOrEmpty(token) || token != evt.HostToken)
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
        Config = e.Config is not null ? new { e.Config.Theme, e.Config.EndDate, e.Config.MaxProposalsPerParticipant } : null,
        ClosedAt = e.ClosedAt,
        WinnerMovieId = e.WinnerMovieId,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        Message = message
    };
}
