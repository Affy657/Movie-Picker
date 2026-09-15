using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetEventDetail;

public sealed class GetEventDetailHandler : IGetEventDetailHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IUserRepository _userRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IFinishedEventWatchlistPass _watchlistCleanup;
    private readonly TimeProvider _clock;

    public GetEventDetailHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IVoteRepository voteRepository,
        IUserRepository userRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IFinishedEventWatchlistPass watchlistCleanup,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _voteRepository = voteRepository;
        _userRepository = userRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _watchlistCleanup = watchlistCleanup;
        _clock = clock;
    }

    public async Task<EventDetailResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        await _watchlistCleanup.RunForEventAsync(evt, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, token, currentUserId);
        var now = _clock.GetUtcNow();
        var eventLifecycle = evt.Lifecycle(now);
        var isFinished = eventLifecycle == EventLifecycle.Finished;
        var lifecycle = MyEventListLifecycle.FromLifecycle(eventLifecycle);

        var participantsTask = _participantRepository.ListByEventIdAsync(evt.Id, ct);
        var movieCountTask = _movieRepository.CountByEventIdAsync(evt.Id, ct);
        var votersCountTask = _voteRepository.CountDistinctVotersByEventIdAsync(evt.Id, ct);
        await Task.WhenAll(participantsTask, movieCountTask, votersCountTask);
        var participants = await participantsTask;
        var movieCount = await movieCountTask;
        var votersCount = await votersCountTask;

        ParticipantResponse? myParticipant = null;
        if (!string.IsNullOrEmpty(currentUserId))
        {
            var mine = participants.FirstOrDefault(p => p.UserId == currentUserId);
            if (mine is not null)
                myParticipant = ParticipantResponse.FromDomain(mine);
        }

        var participantUserIds = participants
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();
        var users = participantUserIds.Count > 0
            ? await _userRepository.ListByIdsAsync(participantUserIds, ct)
            : Array.Empty<User>();
        var userById = users.ToDictionary(u => u.Id);

        var creatorUserId = evt.CreatorUserId;
        var participantsSummary = participants
            .Select(p => ToParticipantSummary(p, userById, creatorUserId))
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
            CreatedAt = evt.CreatedAt,
            UpdatedAt = evt.UpdatedAt,
            IsHost = isHost,
            IsFinished = isFinished,
            Lifecycle = lifecycle,
            Winners = evt.Winners.Select(ToWinnerResponse).ToList(),
            MyParticipant = myParticipant,
            ParticipantCount = participants.Count,
            MovieCount = movieCount,
            VotersCount = votersCount,
            Participants = participantsSummary,
        };
    }

    private static string? ToWinnerPickMethodString(WinnerPickMethod? method) =>
        method switch
        {
            WinnerPickMethod.Manual => "manual",
            WinnerPickMethod.Wheel => "wheel",
            _ => null
        };

    private static EventWinnerResponse ToWinnerResponse(EventWinner winner) => new()
    {
        MovieId = winner.MovieId,
        PickMethod = ToWinnerPickMethodString(winner.Method) ?? string.Empty,
        PickedAt = winner.PickedAt
    };

    private static EventParticipantSummaryResponse ToParticipantSummary(
        Participant p,
        Dictionary<string, User> userById,
        string? creatorUserId)
    {
        User? linkedUser = p.UserId is not null && userById.TryGetValue(p.UserId, out var u) ? u : null;
        return new EventParticipantSummaryResponse
        {
            Id = p.Id,
            Pseudo = p.Pseudo,
            IsCreator = !string.IsNullOrEmpty(creatorUserId) && p.UserId == creatorUserId,
            AvatarId = linkedUser?.AvatarId ?? string.Empty,
            Handle = PublicHandleResolver.Resolve(linkedUser),
        };
    }
}
