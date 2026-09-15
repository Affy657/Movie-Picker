using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.AddMovie;

public sealed class AddMovieHandler : IAddMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly IUserNotificationRepository _notifications;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AddMovieHandler> _logger;
    private readonly TimeProvider _clock;

    public AddMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IPosterImageStore posterImageStore,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        ICurrentUserAccessor currentUserAccessor,
        ITmdbMovieSearch tmdb,
        IUnitOfWork unitOfWork,
        ILogger<AddMovieHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _posterImageStore = posterImageStore;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _notifications = notifications;
        _currentUserAccessor = currentUserAccessor;
        _tmdb = tmdb;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _clock = clock;
    }

    public async Task<MovieWithScoreResponse> HandleAsync(string idOrSlug, AddMovieRequest request, string? callerUserId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.EventFinished();

        if (request.MediaType == MovieMediaType.Tv && evt.Config?.AllowSeries != true)
            throw Errors.TvShowsNotAllowed();

        var poster = await ResolvePosterAsync(request, ct);

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw Errors.InvalidParticipant();

        var currentUserId = callerUserId ?? _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId)
            throw Errors.OwnParticipationOnly();

        if (await _movieRepository.ExistsByEventAndTmdbIdAsync(evt.Id, request.TmdbId, request.MediaType, ct))
            throw Errors.MovieAlreadyProposed();

        if (await _movieRepository.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, request.Title.Trim(), ct))
            throw Errors.MovieTitleAlreadyProposed();

        var now = _clock.GetUtcNow();
        var pitchNote = string.IsNullOrWhiteSpace(request.PitchNote) ? null : request.PitchNote.Trim();
        var genreIdsTask = FetchGenreIdsBestEffortAsync(request.TmdbId, request.MediaType, ct);
        var proposerUserTask = _userRepository.GetByIdAsync(currentUserId, ct);
        await Task.WhenAll(genreIdsTask, proposerUserTask);
        var genreIds = await genreIdsTask;
        var proposerHandle = PublicHandleResolver.Resolve(await proposerUserTask);

        var movie = new Movie
        {
            Id = string.Empty,
            EventId = evt.Id,
            ParticipantId = participant.Id,
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = request.Title.Trim(),
            Year = request.Year,
            PosterPath = poster,
            PitchNote = pitchNote,
            GenreIds = genreIds,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await InsertWithinProposalLimitAsync(evt, participant, movie, ct);

        await NotifyParticipantsOnMovieAddedAsync(evt, created.Title, participant.UserId, CancellationToken.None);

        return new MovieWithScoreResponse
        {
            Id = created.Id,
            EventId = created.EventId,
            ParticipantId = created.ParticipantId,
            TmdbId = created.TmdbId,
            MediaType = created.MediaType,
            Title = created.Title,
            Year = created.Year,
            PosterPath = created.PosterPath,
            PitchNote = created.PitchNote,
            GenreIds = created.GenreIds,
            CreatedAt = created.CreatedAt,
            UpdatedAt = created.UpdatedAt,
            ProposerPseudo = participant.Pseudo,
            ProposerHandle = proposerHandle,
            Score = 0,
            Up = 0,
            Down = 0,
            SeenCount = 0,
            SeenByPseudos = Array.Empty<string>(),
            VotersUpPseudos = Array.Empty<string>()
        };
    }

    private async Task<string?> ResolvePosterAsync(AddMovieRequest request, CancellationToken ct)
    {
        var poster = string.IsNullOrWhiteSpace(request.PosterPath) ? null : request.PosterPath.Trim();
        if (poster is not null && !IsAcceptablePosterPath(poster))
            throw Errors.InvalidPosterPath();

        if (poster is not null && TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(poster, out var norm))
            await _posterImageStore.RegisterTmdbSourceAsync(norm, ct);
        return _posterImageStore.ToPublicPosterPath(poster);
    }

    private async Task<Movie> InsertWithinProposalLimitAsync(
        Event evt,
        Participant participant,
        Movie movie,
        CancellationToken ct)
    {
        var maxProp = evt.Config?.MaxProposalsPerParticipant;
        if (maxProp is not > 0)
        {
            var inserted = await _movieRepository.InsertAsync(movie, ct);
            await _eventRepository.MarkChangedAsync(evt.Id, ct);
            return inserted;
        }

        Movie created = movie;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _eventRepository.LockForWriteAsync(evt.Id, token);
                var count = await _movieRepository.CountByEventAndParticipantAsync(evt.Id, participant.Id, token);
                if (count >= maxProp)
                    throw Errors.ProposalLimitReached(maxProp.Value);
                created = await _movieRepository.InsertAsync(movie, token);
            },
            ct);
        return created;
    }

    private async Task<IReadOnlyList<int>> FetchGenreIdsBestEffortAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct);
            return details?.GenreIds ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TMDB genre lookup failed for {TmdbId}, movie added without genres", tmdbId);
            return [];
        }
    }

    private async Task NotifyParticipantsOnMovieAddedAsync(Event evt, string movieTitle, string? proposerUserId, CancellationToken ct)
    {
        try
        {
            var participants = await _participantRepository.ListByEventIdAsync(evt.Id, ct);
            var userIds = participants
                .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != proposerUserId)
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();
            if (userIds.Count == 0)
                return;

            var users = await _userRepository.ListByIdsAsync(userIds, ct);
            var notifiableIds = users.Where(u => u.NotifiesOn(UserNotificationType.MovieAdded)).Select(u => u.Id).ToHashSet();
            if (notifiableIds.Count == 0)
                return;

            User? proposer = null;
            if (!string.IsNullOrEmpty(proposerUserId))
                proposer = await _userRepository.GetByIdAsync(proposerUserId, ct);

            var subs = await _pushSubscriptions.ListByUserIdsAsync(notifiableIds, ct);
            if (subs.Count > 0)
            {
                var message = new PushMessage(
                    Title: "Un film de plus au menu 🍿",
                    Body: $"{movieTitle} a été ajouté à la soirée {evt.Title}",
                    Tag: $"movie-add-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );

                await PushFanOut.SendToAllAsync(
                    _pushSender,
                    subs.Where(s => notifiableIds.Contains(s.UserId)),
                    message,
                    ct);
            }

            var now = _clock.GetUtcNow();
            foreach (var userId in notifiableIds)
            {
                await _notifications.AddAsync(new UserNotification
                {
                    UserId = userId,
                    Type = UserNotificationType.MovieAdded,
                    ActorHandle = proposer?.Handle,
                    ActorDisplayName = proposer?.DisplayName,
                    ActorAvatarId = proposer?.AvatarId,
                    EventId = evt.Id,
                    EventSlug = evt.Slug,
                    EventTitle = evt.Title,
                    MovieTitle = movieTitle,
                    IsRead = false,
                    CreatedAt = now
                }, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Movie proposed notification failed for movie night {EventId}", evt.Id);
        }
    }

    private static bool IsAcceptablePosterPath(string p) =>
        TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(p, out _)
        || TmdbPosterUrlNormalizer.TryParsePosterKey(p, out _);
}
