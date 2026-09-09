using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
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
    private readonly IUserRepository _userRepository;
    private readonly ITmdbMovieSearch _tmdbMovieSearch;
    private readonly IPosterImageStore _posterImageStore;
    private readonly MoviePickerOptions _options;

    public ListMoviesForEventHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        IUserRepository userRepository,
        ITmdbMovieSearch tmdbMovieSearch,
        IPosterImageStore posterImageStore,
        IOptions<MoviePickerOptions> options)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _userRepository = userRepository;
        _tmdbMovieSearch = tmdbMovieSearch;
        _posterImageStore = posterImageStore;
        _options = options.Value;
    }

    private static User? ResolveProposerUser(
        string participantId,
        IReadOnlyDictionary<string, Participant> participantById,
        IReadOnlyDictionary<string, User> userById)
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
        IReadOnlyDictionary<string, string> pseudos)
    {
        if (!seenAgg.TryGetValue(movieId, out var seen))
            return (0, Array.Empty<string>());
        return (seen.Count, ResolvePseudos(seen.ParticipantIds, pseudos));
    }

    private static IReadOnlyList<string> ResolveUpVoterPseudos(
        string movieId,
        IReadOnlyDictionary<string, IReadOnlyList<string>> upVotersAgg,
        IReadOnlyDictionary<string, string> pseudos)
    {
        if (!upVotersAgg.TryGetValue(movieId, out var upVoters))
            return Array.Empty<string>();
        return ResolvePseudos(upVoters, pseudos);
    }

    public async Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string idOrSlug,
        string? participantId = null,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        var movieIds = movies.Select(m => m.Id).ToList();
        var scoresTask = _voteRepository.AggregateScoresByMovieIdsAsync(movieIds, ct);
        var seenAggTask = _seenMarkRepository.AggregateByMovieIdsAsync(evt.Id, movieIds, ct);
        var upVotersAggTask = _voteRepository.AggregateUpVotersByMovieIdsAsync(movieIds, ct);
        var eventParticipantsTask = _participantRepository.ListByEventIdAsync(evt.Id, ct);
        await Task.WhenAll(scoresTask, seenAggTask, upVotersAggTask, eventParticipantsTask);
        var scores = await scoresTask;
        var seenAgg = await seenAggTask;
        var upVotersAgg = await upVotersAggTask;
        var eventParticipants = await eventParticipantsTask;

        IReadOnlyDictionary<string, int> myVotes = string.IsNullOrEmpty(participantId)
            ? new Dictionary<string, int>()
            : await _voteRepository.GetParticipantVotesByEventAsync(evt.Id, participantId, ct);
        var seenParticipantIds = seenAgg.Values.SelectMany(v => v.ParticipantIds).Distinct().ToList();
        var upVoterParticipantIds = upVotersAgg.Values.SelectMany(v => v).Distinct().ToList();
        var participantIds = movies.Select(m => m.ParticipantId).Concat(seenParticipantIds).Concat(upVoterParticipantIds).Distinct().ToList();

        var participantById = eventParticipants.ToDictionary(p => p.Id);
        var proposerUserIds = movies
            .Select(m => participantById.TryGetValue(m.ParticipantId, out var pp) ? pp.UserId : null)
            .Where(id => !string.IsNullOrEmpty(id))
            .Select(id => id!)
            .Distinct()
            .ToList();

        var pseudosTask = _participantRepository.GetPseudosByIdsAsync(participantIds, ct);
        var proposerUsersTask = proposerUserIds.Count > 0
            ? _userRepository.ListByIdsAsync(proposerUserIds, ct)
            : Task.FromResult<IReadOnlyList<User>>(Array.Empty<User>());
        await Task.WhenAll(pseudosTask, proposerUsersTask);
        var pseudos = await pseudosTask;
        var proposerUsers = await proposerUsersTask;
        var userById = proposerUsers.ToDictionary(u => u.Id);

        var enrichmentByKey = await BuildEnrichmentMapAsync(movies, ct);

        await _posterImageStore.RegisterTmdbSourcesAsync(CollectTmdbPosterSources(movies), ct);

        var list = new List<MovieWithScoreResponse>(movies.Count);
        foreach (var m in movies)
        {
            scores.TryGetValue(m.Id, out var s);
            pseudos.TryGetValue(m.ParticipantId, out var pseudo);

            var proposerHandle = PublicHandleResolver.Resolve(
                ResolveProposerUser(m.ParticipantId, participantById, userById));

            var (seenCount, seenByPseudos) = ResolveSeenSummary(m.Id, seenAgg, pseudos);
            var votersUpPseudos = ResolveUpVoterPseudos(m.Id, upVotersAgg, pseudos);

            enrichmentByKey.TryGetValue((m.TmdbId, m.MediaType.ToString()), out var enr);
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
                    ProposerPseudo = pseudo ?? string.Empty,
                    ProposerHandle = proposerHandle,
                    Score = s.Score,
                    Up = s.Up,
                    Down = s.Down,
                    MyVote = myVote,
                    SeenCount = seenCount,
                    SeenByPseudos = seenByPseudos,
                    VotersUpPseudos = votersUpPseudos,
                    VoteAverage = enr?.VoteAverage,
                    WatchProviders = enr is null ? Array.Empty<WatchProviderOfferResponse>() : WatchProviderMapping.ToDto(enr.WatchProviders),
                    TmdbWatchPageUrl = enr?.TmdbWatchPageUrl,
                    RuntimeMinutes = enr?.RuntimeMinutes,
                    ReleaseDate = enr?.ReleaseDate
                });
        }

        return list;
    }

    private async Task<ConcurrentDictionary<(int, string), TmdbMovieEnrichment?>> BuildEnrichmentMapAsync(
        IReadOnlyList<Movie> movies,
        CancellationToken ct)
    {
        var enrichmentByKey = new ConcurrentDictionary<(int, string), TmdbMovieEnrichment?>();
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            return enrichmentByKey;

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var distinctPairs = movies.Select(x => (x.TmdbId, x.MediaType)).Distinct().ToList();
        var parallel = Math.Clamp(_options.TmdbListEnrichmentMaxParallelism, 1, 16);
        await Parallel.ForEachAsync(
                distinctPairs,
                new ParallelOptions { MaxDegreeOfParallelism = parallel, CancellationToken = ct },
                async (pair, c) =>
                {
                    var (tmdbId, mediaType) = pair;
                    var enr = await _tmdbMovieSearch.GetEnrichmentAsync(tmdbId, mediaType, region, c);
                    enrichmentByKey[(tmdbId, mediaType.ToString())] = enr;
                })
            .ConfigureAwait(false);
        return enrichmentByKey;
    }

    private static List<string> CollectTmdbPosterSources(IReadOnlyList<Movie> movies)
    {
        var sources = new List<string>();
        foreach (var m in movies)
        {
            if (TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(m.PosterPath, out var src))
                sources.Add(src);
        }
        return sources;
    }

    private static List<string> ResolvePseudos(
        IEnumerable<string> participantIds,
        IReadOnlyDictionary<string, string> pseudos)
    {
        var result = new List<string>();
        foreach (var pid in participantIds)
        {
            if (result.Count >= MaxPseudosPerMovie)
                break;
            if (pseudos.TryGetValue(pid, out var p) && !string.IsNullOrWhiteSpace(p))
                result.Add(p);
        }
        return result;
    }
}
