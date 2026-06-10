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
    private const int MaxSeenByPseudosPerMovie = 30;

    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly ITmdbMovieSearch _tmdbMovieSearch;
    private readonly IPosterImageStore _posterImageStore;
    private readonly MoviePickerOptions _options;

    public ListMoviesForEventHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        ITmdbMovieSearch tmdbMovieSearch,
        IPosterImageStore posterImageStore,
        IOptions<MoviePickerOptions> options)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _tmdbMovieSearch = tmdbMovieSearch;
        _posterImageStore = posterImageStore;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string idOrSlug,
        string? participantId = null,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        var movieIds = movies.Select(m => m.Id).ToList();
        var scores = await _voteRepository.AggregateScoresByMovieIdsAsync(movieIds, ct);
        var seenAgg = await _seenMarkRepository.AggregateByMovieIdsAsync(evt.Id, movieIds, ct);

        IReadOnlyDictionary<string, int> myVotes = string.IsNullOrEmpty(participantId)
            ? new Dictionary<string, int>()
            : await _voteRepository.GetParticipantVotesByEventAsync(evt.Id, participantId, ct);
        var seenParticipantIds = seenAgg.Values.SelectMany(v => v.ParticipantIds).Distinct().ToList();
        var participantIds = movies.Select(m => m.ParticipantId).Concat(seenParticipantIds).Distinct().ToList();
        var pseudos = await _participantRepository.GetPseudosByIdsAsync(participantIds, ct);

        var enrichmentByKey = await BuildEnrichmentMapAsync(movies, ct);

        await _posterImageStore.RegisterTmdbSourcesAsync(CollectTmdbPosterSources(movies), ct);

        var list = new List<MovieWithScoreResponse>(movies.Count);
        foreach (var m in movies)
        {
            scores.TryGetValue(m.Id, out var s);
            pseudos.TryGetValue(m.ParticipantId, out var pseudo);

            var seenCount = 0;
            IReadOnlyList<string> seenByPseudos = Array.Empty<string>();
            if (seenAgg.TryGetValue(m.Id, out var seen))
            {
                seenCount = seen.Count;
                seenByPseudos = ResolveSeenPseudos(seen.ParticipantIds, pseudos);
            }

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
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    ProposerPseudo = pseudo ?? string.Empty,
                    Score = s.Score,
                    Up = s.Up,
                    Down = s.Down,
                    MyVote = myVote,
                    SeenCount = seenCount,
                    SeenByPseudos = seenByPseudos,
                    VoteAverage = enr?.VoteAverage,
                    WatchProviders = enr is null ? Array.Empty<WatchProviderOfferResponse>() : WatchProviderMapping.ToDto(enr.WatchProviders),
                    TmdbWatchPageUrl = enr?.TmdbWatchPageUrl,
                    RuntimeMinutes = enr?.RuntimeMinutes
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

    private static IReadOnlyList<string> ResolveSeenPseudos(
        IEnumerable<string> participantIds,
        IReadOnlyDictionary<string, string> pseudos)
    {
        var result = new List<string>();
        foreach (var pid in participantIds)
        {
            if (result.Count >= MaxSeenByPseudosPerMovie)
                break;
            if (pseudos.TryGetValue(pid, out var p) && !string.IsNullOrWhiteSpace(p))
                result.Add(p);
        }
        return result;
    }
}
