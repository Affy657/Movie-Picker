using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetEventDetail;

public sealed class GetEventDetailHandler : IGetEventDetailHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IPosterImageStore _posterImageStore;

    public GetEventDetailHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IPosterImageStore posterImageStore)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _posterImageStore = posterImageStore;
    }

    public async Task<EventDetailResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        var token = _hostTokenAccessor.GetHostToken();
        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, token, currentUserId);
        var terminé = evt.IsFinished(DateTimeOffset.UtcNow);

        WinnerMovieResponse? winner = null;
        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
        {
            var wm = await _movieRepository.GetByIdAsync(evt.WinnerMovieId, ct);
            if (wm is not null)
            {
                if (wm.PosterPath is not null &&
                    TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(wm.PosterPath, out var pNorm))
                    await _posterImageStore.RegisterTmdbSourceAsync(pNorm, ct);
                var posterOut = _posterImageStore.ToPublicPosterPath(wm.PosterPath);
                winner = new WinnerMovieResponse
                {
                    Id = wm.Id,
                    EventId = wm.EventId,
                    ParticipantId = wm.ParticipantId,
                    TmdbId = wm.TmdbId,
                    Title = wm.Title,
                    Year = wm.Year,
                    PosterPath = posterOut,
                    CreatedAt = wm.CreatedAt,
                    UpdatedAt = wm.UpdatedAt
                };
            }
        }

        ParticipantResponse? myParticipant = null;
        if (!string.IsNullOrEmpty(currentUserId))
        {
            var p = await _participantRepository.FindByEventAndUserIdAsync(evt.Id, currentUserId, ct);
            if (p is not null)
                myParticipant = MapMyParticipant(p);
        }

        return new EventDetailResponse
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            Slug = evt.Slug,
            Config = EventConfigResponse.FromEvent(evt),
            ClosedAt = evt.ClosedAt,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt,
            UpdatedAt = evt.UpdatedAt,
            IsHost = isHost,
            Terminé = terminé,
            WinnerMovie = winner,
            MyParticipant = myParticipant
        };
    }

    private static ParticipantResponse MapMyParticipant(Participant p) => new()
    {
        Id = p.Id,
        EventId = p.EventId,
        Pseudo = p.Pseudo,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
