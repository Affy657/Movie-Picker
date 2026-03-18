using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetEventDetail;

public sealed class GetEventDetailHandler : IGetEventDetailHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;

    public GetEventDetailHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IHostTokenAccessor hostTokenAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _hostTokenAccessor = hostTokenAccessor;
    }

    public async Task<EventDetailResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        var token = _hostTokenAccessor.GetHostToken();
        var isHost = !string.IsNullOrEmpty(token) && token == evt.HostToken;
        var terminé = evt.IsFinished(DateTimeOffset.UtcNow);

        WinnerMovieResponse? winner = null;
        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
        {
            var wm = await _movieRepository.GetByIdAsync(evt.WinnerMovieId, ct);
            if (wm is not null)
            {
                winner = new WinnerMovieResponse
                {
                    Id = wm.Id,
                    EventId = wm.EventId,
                    ParticipantId = wm.ParticipantId,
                    TmdbId = wm.TmdbId,
                    Title = wm.Title,
                    Year = wm.Year,
                    PosterPath = wm.PosterPath,
                    CreatedAt = wm.CreatedAt,
                    UpdatedAt = wm.UpdatedAt
                };
            }
        }

        return new EventDetailResponse
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            Slug = evt.Slug,
            Config = evt.Config is not null ? new { evt.Config.Theme, evt.Config.EndDate, evt.Config.MaxProposalsPerParticipant } : null,
            ClosedAt = evt.ClosedAt,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt,
            UpdatedAt = evt.UpdatedAt,
            IsHost = isHost,
            Terminé = terminé,
            WinnerMovie = winner
        };
    }
}
