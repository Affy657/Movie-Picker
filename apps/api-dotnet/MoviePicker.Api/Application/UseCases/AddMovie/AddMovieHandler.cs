using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Configuration;
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
    private readonly EventAudienceNotifier _audience;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AddMovieHandler> _logger;
    private readonly TimeProvider _clock;
    private readonly MoviePickerOptions _options;

    public AddMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IPosterImageStore posterImageStore,
        IUserRepository userRepository,
        EventAudienceNotifier audience,
        ITmdbMovieSearch tmdb,
        IUnitOfWork unitOfWork,
        ILogger<AddMovieHandler> logger,
        TimeProvider clock,
        IOptions<MoviePickerOptions> options)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _posterImageStore = posterImageStore;
        _userRepository = userRepository;
        _audience = audience;
        _tmdb = tmdb;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _clock = clock;
        _options = options.Value;
    }

    public async Task<MovieWithScoreResponse> HandleAsync(string userId, string idOrSlug, AddMovieRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.EventFinished();

        if (request.MediaType == MovieMediaType.Tv && evt.Config?.AllowSeries != true)
            throw Errors.TvShowsNotAllowed();

        var poster = await TmdbPosterPathResolver.ResolveAsync(_posterImageStore, request.PosterPath, ct);

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw Errors.InvalidParticipant();

        if (participant.UserId != userId)
            throw Errors.OwnParticipationOnly();

        if (await _movieRepository.ExistsByEventAndTmdbIdAsync(evt.Id, request.TmdbId, request.MediaType, ct))
            throw Errors.MovieAlreadyProposed();

        var year = MovieYear.Normalize(request.Year);
        if (await _movieRepository.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, request.Title.Trim(), year, ct))
            throw Errors.MovieTitleAlreadyProposed();

        var now = _clock.StorageNow();
        var pitchNote = string.IsNullOrWhiteSpace(request.PitchNote) ? null : request.PitchNote.Trim();
        var genreIdsTask = FetchGenreIdsBestEffortAsync(request.TmdbId, request.MediaType, request.GenreIds, ct);
        var proposerUserTask = _userRepository.GetByIdAsync(userId, ct);
        await Task.WhenAll(genreIdsTask, proposerUserTask);
        var genreIds = await genreIdsTask;
        var proposer = await proposerUserTask;

        var movie = new Movie
        {
            Id = string.Empty,
            EventId = evt.Id,
            ParticipantId = participant.Id,
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = request.Title.Trim(),
            Year = year ?? string.Empty,
            PosterPath = poster,
            PitchNote = pitchNote,
            GenreIds = genreIds,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await InsertWithinProposalLimitAsync(evt, participant, movie, ct);

        await _audience.NotifyParticipantsAsync(MovieAddedMessage(evt, created.Title, proposer), participant.UserId, CancellationToken.None);

        var key = (created.TmdbId, created.MediaType);
        var enrichments = await WatchedMoviesFacts.LoadEnrichmentsAsync([key], _tmdb, _options, ct);
        return MovieWithScoreResponse.From(
            created,
            _posterImageStore,
            new MovieProposer(participant.Pseudo, proposer is null ? null : DisplayedPerson.From(proposer).PublicHandle),
            MovieNightActivity.None,
            enrichments.GetValueOrDefault(key));
    }

    private async Task<Movie> InsertWithinProposalLimitAsync(
        Event evt,
        Participant participant,
        Movie movie,
        CancellationToken ct)
    {
        var maxProp = evt.Config?.MaxProposalsPerParticipant;
        Movie created = movie;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _eventRepository.LockForWriteAsync(evt.Id, token);
                if (await _participantRepository.FindByIdAndEventIdAsync(participant.Id, evt.Id, token) is null)
                    throw Errors.InvalidParticipant();
                if (await _movieRepository.CountByEventIdAsync(evt.Id, token) >= EventConfig.MaxMoviesPerEventCap)
                    throw Errors.EventMovieLimitReached(EventConfig.MaxMoviesPerEventCap);
                if (maxProp is > 0)
                {
                    var count = await _movieRepository.CountByEventAndParticipantAsync(evt.Id, participant.Id, token);
                    if (count >= maxProp)
                        throw Errors.ProposalLimitReached(maxProp.Value);
                }
                created = await _movieRepository.InsertAsync(movie, token);
            },
            ct);
        return created;
    }

    private async Task<IReadOnlyList<int>> FetchGenreIdsBestEffortAsync(
        int tmdbId,
        MovieMediaType mediaType,
        IReadOnlyList<int>? searchResultGenreIds,
        CancellationToken ct)
    {
        var knownGenreIds = searchResultGenreIds is null
            ? []
            : searchResultGenreIds.Where(id => id > 0).Distinct().ToList();
        try
        {
            var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct);
            return details?.GenreIds ?? knownGenreIds;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TMDB genre lookup failed for {TmdbId}, movie added with the genres of its search result", tmdbId);
            return knownGenreIds;
        }
    }

    private static EventAudienceMessage MovieAddedMessage(Event evt, string movieTitle, User? proposer) => new(
        evt.Id,
        new UserNotification
        {
            Type = UserNotificationType.MovieAdded,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            MovieTitle = movieTitle
        }.WithActor(proposer),
        ServerCopy.Push.MovieAdded(movieTitle, evt.Title).ToMessage(
            tag: $"movie-add-{evt.Id}",
            url: FrontRoutes.EventDetail(evt.Slug)));
}
