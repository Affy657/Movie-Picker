using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public sealed class ListMoviesForEventHandler : IListMoviesForEventHandler
{
    /// <summary>Limite volontairement basse : on affiche quelques pseudos, pas toute la liste.</summary>
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

    public async Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        var movieIds = movies.Select(m => m.Id).ToList();
        var scores = await _voteRepository.AggregateScoresByMovieIdsAsync(movieIds, ct);
        var seenAgg = await _seenMarkRepository.AggregateByMovieIdsAsync(evt.Id, movieIds, ct);
        var seenParticipantIds = seenAgg.Values.SelectMany(v => v.ParticipantIds).Distinct().ToList();
        var participantIds = movies.Select(m => m.ParticipantId).Concat(seenParticipantIds).Distinct().ToList();
        var pseudos = await _participantRepository.GetPseudosByIdsAsync(participantIds, ct);

        var enrichmentByTmdb = new ConcurrentDictionary<int, TmdbMovieEnrichment?>();
        if (!string.IsNullOrWhiteSpace(_options.TmdbApiKey))
        {
            var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
                ? "FR"
                : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
            var distinctTmdb = movies.Select(x => x.TmdbId).Distinct().ToList();
            var parallel = Math.Clamp(_options.TmdbListEnrichmentMaxParallelism, 1, 16);
            await Parallel.ForEachAsync(
                    distinctTmdb,
                    new ParallelOptions { MaxDegreeOfParallelism = parallel, CancellationToken = ct },
                    async (tmdbId, c) =>
                    {
                        var enr = await _tmdbMovieSearch.GetEnrichmentAsync(tmdbId, region, c);
                        enrichmentByTmdb[tmdbId] = enr;
                    })
                .ConfigureAwait(false);
        }

        var tmdbSources = new List<string>();
        foreach (var m in movies)
        {
            if (TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(m.PosterPath, out var src))
                tmdbSources.Add(src);
        }

        await _posterImageStore.RegisterTmdbSourcesAsync(tmdbSources, ct);

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
                var list2 = new List<string>();
                foreach (var pid in seen.ParticipantIds)
                {
                    if (list2.Count >= MaxSeenByPseudosPerMovie)
                        break;
                    if (pseudos.TryGetValue(pid, out var p) && !string.IsNullOrWhiteSpace(p))
                        list2.Add(p);
                }
                seenByPseudos = list2;
            }

            enrichmentByTmdb.TryGetValue(m.TmdbId, out var enr);
            var posterOut = _posterImageStore.ToPublicPosterPath(m.PosterPath);

            list.Add(
                new MovieWithScoreResponse
                {
                    Id = m.Id,
                    EventId = m.EventId,
                    ParticipantId = m.ParticipantId,
                    TmdbId = m.TmdbId,
                    Title = m.Title,
                    Year = m.Year,
                    PosterPath = posterOut,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    ProposerPseudo = pseudo ?? string.Empty,
                    Score = s.Score,
                    Up = s.Up,
                    Down = s.Down,
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
}
