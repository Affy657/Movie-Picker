using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain;
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

    public async Task<MovieWithScoreResponse> HandleAsync(string userId, string slug, AddMovieRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredBySlugAsync(slug, ct);

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.EventFinished();

        if (request.MediaType == MovieMediaType.Tv && evt.Config?.AllowSeries != true)
            throw Errors.TvShowsNotAllowed();

        var requestedPoster = await TmdbPosterPathResolver.ResolveAsync(_posterImageStore, request.PosterPath, ct);

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw Errors.InvalidParticipant();

        if (participant.UserId != userId)
            throw Errors.OwnParticipationOnly();

        if (await _movieRepository.ExistsByEventAndTmdbIdAsync(evt.Id, request.TmdbId, request.MediaType, ct))
            throw Errors.MovieAlreadyProposed();

        var lookupTask = LookUpOnTmdbAsync(request.TmdbId, request.MediaType, ct);
        var proposerUserTask = _userRepository.GetByIdAsync(userId, ct);
        await Task.WhenAll(lookupTask, proposerUserTask);
        var lookup = await lookupTask;
        var proposer = await proposerUserTask;
        if (lookup.Answered && lookup.Details is null)
            throw Errors.MovieNotFound();

        var facts = await ProposedFactsAsync(request, lookup.Details, requestedPoster, ct);
        if (await _movieRepository.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, facts.Title, facts.Year, ct))
            throw Errors.MovieTitleAlreadyProposed();

        var now = _clock.StorageNow();
        var pitchNote = string.IsNullOrWhiteSpace(request.PitchNote) ? null : request.PitchNote.Trim();

        var movie = new Movie
        {
            Id = string.Empty,
            EventId = evt.Id,
            ParticipantId = participant.Id,
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = facts.Title,
            Year = facts.Year ?? string.Empty,
            PosterPath = facts.PosterPath,
            PitchNote = pitchNote,
            GenreIds = TmdbTitleFacts.GenreIds(request.GenreIds, lookup.Details),
            CreatedAt = now,
            UpdatedAt = now
        };

        var (created, night) = await InsertWithinProposalLimitAsync(slug, evt.Id, participant, movie, ct);

        await _audience.NotifyParticipantsAsync(MovieAddedMessage(night, created.Title, proposer), participant.UserId, CancellationToken.None);

        var key = (created.TmdbId, created.MediaType);
        var enrichments = await TmdbEnrichments.LoadAsync([key], _tmdb, _options, CatalogLanguage.French, ct);
        return MovieWithScoreResponse.From(
            night.HideProposalTime(created),
            _posterImageStore,
            new MovieProposer(participant.Pseudo, proposer is null ? null : DisplayedPerson.From(proposer).PublicHandle),
            MovieNightActivity.None,
            enrichments.GetValueOrDefault(key));
    }

    private async Task<(Movie Created, Event Night)> InsertWithinProposalLimitAsync(
        string slug,
        string eventId,
        Participant participant,
        Movie movie,
        CancellationToken ct)
    {
        Movie created = movie;
        Event? night = null;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _eventRepository.LockForWriteAsync(eventId, token);
                night = await _eventRepository.GetRequiredBySlugAsync(slug, token);
                if (await _participantRepository.FindByIdAndEventIdAsync(participant.Id, eventId, token) is null)
                    throw Errors.InvalidParticipant();
                if (await _movieRepository.CountByEventIdAsync(eventId, token) >= EventConfig.MaxMoviesPerEventCap)
                    throw Errors.EventMovieLimitReached(EventConfig.MaxMoviesPerEventCap);
                if (night.Config?.MaxProposalsPerParticipant is > 0 and var maxProp)
                {
                    var count = await _movieRepository.CountByEventAndParticipantAsync(eventId, participant.Id, token);
                    if (count >= maxProp)
                        throw Errors.ProposalLimitReached(maxProp);
                }
                created = night.HasAnonymousProposals
                    ? await _movieRepository.InsertWithUntimedIdAsync(movie, token)
                    : await _movieRepository.InsertAsync(movie, token);
            },
            ct);
        return (created, night!);
    }

    private async Task<TmdbLookup> LookUpOnTmdbAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        try
        {
            return new TmdbLookup(true, await _tmdb.GetDetailsAsync(tmdbId, mediaType, CatalogLanguage.French, ct));
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "TMDB lookup failed for {TmdbId}, movie added with the title, year and poster sent by the browser", tmdbId);
            return new TmdbLookup(false, null);
        }
    }

    private async Task<ProposedFacts> ProposedFactsAsync(
        AddMovieRequest request,
        TmdbMovieDetails? details,
        string? requestedPoster,
        CancellationToken ct)
    {
        if (details is null)
            return new ProposedFacts(BrowserTitle(request.Title), MovieYear.Normalize(request.Year), requestedPoster);

        var title = UserText.Clean(details.Title);
        return new ProposedFacts(
            UserText.HasVisibleCharacter(title) ? title : BrowserTitle(request.Title),
            TmdbTitleFacts.ReleaseYear(details.ReleaseDate),
            await _posterImageStore.ToStoredPosterPathAsync(details.PosterUrl, ct));
    }

    private static string BrowserTitle(string title)
    {
        var cleaned = UserText.Clean(title);
        return UserText.HasVisibleCharacter(cleaned) ? cleaned : throw Errors.MovieTitleRequired();
    }

    private sealed record TmdbLookup(bool Answered, TmdbMovieDetails? Details);

    private sealed record ProposedFacts(string Title, string? Year, string? PosterPath);

    private static EventAudienceMessage MovieAddedMessage(Event evt, string movieTitle, User? proposer) => new(
        evt.Id,
        new UserNotification
        {
            Type = UserNotificationType.MovieAdded,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            MovieTitle = movieTitle
        }.WithActor(evt.HasAnonymousProposals ? null : proposer),
        ServerCopy.Push.MovieAdded(movieTitle, evt.Title).ToMessage(
            tag: $"movie-add-{evt.Id}",
            url: FrontRoutes.EventDetail(evt.Slug)));
}
