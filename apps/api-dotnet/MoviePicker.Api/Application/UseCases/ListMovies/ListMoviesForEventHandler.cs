using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public sealed class ListMoviesForEventHandler : IListMoviesForEventHandler
{
    private const int MaxPseudosPerMovie = 30;

    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITmdbMovieSearch _tmdbMovieSearch;
    private readonly IPosterImageStore _posterImageStore;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly MoviePickerOptions _options;

    public ListMoviesForEventHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        IMovieRatingRepository ratingRepository,
        IUserRepository userRepository,
        ITmdbMovieSearch tmdbMovieSearch,
        IPosterImageStore posterImageStore,
        ICurrentUserAccessor currentUserAccessor,
        IOptions<MoviePickerOptions> options)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _ratingRepository = ratingRepository;
        _userRepository = userRepository;
        _tmdbMovieSearch = tmdbMovieSearch;
        _posterImageStore = posterImageStore;
        _currentUserAccessor = currentUserAccessor;
        _options = options.Value;
    }

    private bool IsCallersOwnParticipant(string? participantId, IReadOnlyList<Participant> eventParticipants)
    {
        if (string.IsNullOrEmpty(participantId))
            return false;
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            return false;
        var participant = eventParticipants.FirstOrDefault(p => p.Id == participantId);
        return participant is not null && participant.UserId == currentUserId;
    }

    private static UserCard? ResolveProposerUser(
        string participantId,
        Dictionary<string, Participant> participantById,
        Dictionary<string, UserCard> userById)
    {
        if (!participantById.TryGetValue(participantId, out var participant))
            return null;
        if (participant.UserId is null)
            return null;
        return userById.TryGetValue(participant.UserId, out var user) ? user : null;
    }

    private static (int Count, IReadOnlyList<string> Pseudos) ResolveSeenSummary(
        string movieId,
        IReadOnlyDictionary<string, SeenMarkAggregate> seenAgg,
        Dictionary<string, Participant> participantById)
    {
        if (!seenAgg.TryGetValue(movieId, out var seen))
            return (0, Array.Empty<string>());
        return (seen.Count, ResolvePseudos(seen.ParticipantIds, participantById));
    }

    public async Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string idOrSlug,
        string? participantId = null,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        return await ToResponsesAsync(evt, movies, participantId, ct);
    }

    public async Task<IReadOnlyList<MovieWithScoreResponse>> HandleSelectionAsync(
        string idOrSlug,
        IReadOnlyCollection<string> movieIds,
        string? participantId = null,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        var selected = await _movieRepository.ListByIdsAsync(movieIds, ct);
        return await ToResponsesAsync(evt, selected.Where(m => m.EventId == evt.Id).ToList(), participantId, ct);
    }

    private async Task<IReadOnlyList<MovieWithScoreResponse>> ToResponsesAsync(
        Event evt,
        IReadOnlyList<Movie> movies,
        string? participantId,
        CancellationToken ct)
    {
        var movieIds = movies.Select(m => m.Id).ToList();
        var voteSummariesTask = _voteRepository.AggregateSummariesByMovieIdsAsync(movieIds, ct);
        var seenAggTask = _seenMarkRepository.AggregateByMovieIdsAsync(evt.Id, movieIds, ct);
        var eventParticipantsTask = _participantRepository.ListByEventIdAsync(evt.Id, ct);
        var ratingsTask = evt.HasWinner
            ? _ratingRepository.ListByEventIdAsync(evt.Id, ct)
            : Task.FromResult<IReadOnlyList<MovieRating>>(Array.Empty<MovieRating>());
        await Task.WhenAll(voteSummariesTask, seenAggTask, eventParticipantsTask, ratingsTask);
        var voteSummaries = await voteSummariesTask;
        var seenAgg = await seenAggTask;
        var eventParticipants = await eventParticipantsTask;
        var ratingsByMovie = (await ratingsTask)
            .GroupBy(r => r.MovieId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<MovieRatingResponse>)g.Select(MovieRatingResponse.FromDomain).ToList());

        IReadOnlyDictionary<string, int> myVotes = IsCallersOwnParticipant(participantId, eventParticipants)
            ? await _voteRepository.GetParticipantVotesByEventAsync(evt.Id, participantId!, ct)
            : new Dictionary<string, int>();

        var participantById = eventParticipants.ToDictionary(p => p.Id);
        var proposerUserIds = movies
            .Select(m => participantById.TryGetValue(m.ParticipantId, out var pp) ? pp.UserId : null)
            .Where(id => !string.IsNullOrEmpty(id))
            .Select(id => id!)
            .Distinct()
            .ToList();

        IReadOnlyList<UserCard> proposerUsers = proposerUserIds.Count > 0
            ? await _userRepository.ListCardsByIdsAsync(proposerUserIds, ct)
            : [];
        var userById = proposerUsers.ToDictionary(u => u.Id);

        var enrichmentByKey = await BuildEnrichmentMapAsync(movies, ct);

        var list = new List<MovieWithScoreResponse>(movies.Count);
        foreach (var m in movies)
        {
            var votes = voteSummaries.GetValueOrDefault(m.Id, MovieVoteSummary.None);
            participantById.TryGetValue(m.ParticipantId, out var proposer);

            var proposerHandle = PublicHandleResolver.Resolve(
                ResolveProposerUser(m.ParticipantId, participantById, userById));

            var (seenCount, seenByPseudos) = ResolveSeenSummary(m.Id, seenAgg, participantById);
            var votersUpPseudos = ResolvePseudos(votes.UpVoterIds, participantById);

            enrichmentByKey.TryGetValue((m.TmdbId, m.MediaType), out var enr);
            var posterOut = _posterImageStore.ToPublicPosterPath(m.PosterPath);

            int? myVote = myVotes.TryGetValue(m.Id, out var mv) ? mv : null;

            list.Add(
                new MovieWithScoreResponse
                {
                    Id = m.Id,
                    EventId = m.EventId,
                    ParticipantId = m.ParticipantId,
                    TmdbId = m.TmdbId,
                    MediaType = m.MediaType,
                    Title = m.Title,
                    Year = m.Year,
                    PosterPath = posterOut,
                    PitchNote = m.PitchNote,
                    GenreIds = m.GenreIds,
                    ExcludedFromWheel = m.ExcludedFromWheel,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    ProposerPseudo = proposer?.Pseudo ?? string.Empty,
                    ProposerHandle = proposerHandle,
                    Score = votes.Score,
                    Up = votes.Up,
                    Down = votes.Down,
                    MyVote = myVote,
                    SeenCount = seenCount,
                    SeenByPseudos = seenByPseudos,
                    VotersUpPseudos = votersUpPseudos,
                    Ratings = ratingsByMovie.TryGetValue(m.Id, out var ratings) ? ratings : Array.Empty<MovieRatingResponse>(),
                    VoteAverage = enr?.VoteAverage,
                    WatchProviders = enr is null ? Array.Empty<WatchProviderOfferResponse>() : WatchProviderMapping.ToDto(enr.WatchProviders),
                    TmdbWatchPageUrl = enr?.TmdbWatchPageUrl,
                    RuntimeMinutes = enr?.RuntimeMinutes,
                    ReleaseDate = enr?.ReleaseDate
                });
        }

        return list;
    }

    private async Task<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>> BuildEnrichmentMapAsync(
        IReadOnlyList<Movie> movies,
        CancellationToken ct)
    {
        if (!_options.HasTmdbCredentials)
            return new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>();

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var keys = movies.Select(x => (x.TmdbId, x.MediaType)).Distinct().ToList();
        return await _tmdbMovieSearch.GetEnrichmentsAsync(keys, region, ct).ConfigureAwait(false);
    }

    private static List<string> ResolvePseudos(
        IEnumerable<string> participantIds,
        Dictionary<string, Participant> participantById)
    {
        var result = new List<string>();
        foreach (var pid in participantIds)
        {
            if (result.Count >= MaxPseudosPerMovie)
                break;
            if (participantById.TryGetValue(pid, out var p) && !string.IsNullOrWhiteSpace(p.Pseudo))
                result.Add(p.Pseudo);
        }
        return result;
    }
}
