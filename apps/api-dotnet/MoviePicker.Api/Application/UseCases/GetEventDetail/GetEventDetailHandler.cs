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
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, token, currentUserId);
        var isFinished = evt.IsFinished(DateTimeOffset.UtcNow);

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
                winner = WinnerMovieResponse.FromDomain(wm, posterOut);
            }
        }

        var participantsTask = _participantRepository.ListByEventIdAsync(evt.Id, ct);
        var movieCountTask = _movieRepository.CountByEventIdAsync(evt.Id, ct);
        await Task.WhenAll(participantsTask, movieCountTask);
        var participants = await participantsTask;
        var movieCount = await movieCountTask;

        ParticipantResponse? myParticipant = null;
        if (!string.IsNullOrEmpty(currentUserId))
        {
            var mine = participants.FirstOrDefault(p => p.UserId == currentUserId);
            if (mine is not null)
                myParticipant = ParticipantResponse.FromDomain(mine);
        }

        var creatorUserId = evt.CreatorUserId;
        var participantsSummary = participants
            .Select(p => new EventParticipantSummaryResponse
            {
                Id = p.Id,
                Pseudo = p.Pseudo,
                IsCreator = !string.IsNullOrEmpty(creatorUserId) && p.UserId == creatorUserId,
            })
            .ToList();

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
            IsFinished = isFinished,
            WinnerMovie = winner,
            MyParticipant = myParticipant,
            ParticipantCount = participants.Count,
            MovieCount = movieCount,
            Participants = participantsSummary,
        };
    }

}
