using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class WatchedHistoryReader
{
    public const int ParticipantsCap = 500;

    private static readonly IReadOnlyDictionary<string, int> NoRatings = new Dictionary<string, int>();

    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IMovieRatingRepository _ratings;
    private readonly IWatchedTitleRepository _watchedTitles;
    private readonly TimeProvider _clock;

    public WatchedHistoryReader(
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        IMovieRatingRepository ratings,
        IWatchedTitleRepository watchedTitles,
        TimeProvider clock)
    {
        _participants = participants;
        _events = events;
        _movies = movies;
        _ratings = ratings;
        _watchedTitles = watchedTitles;
        _clock = clock;
    }

    public async Task<WatchedHistory> ReadRatedAsync(string userId, CancellationToken ct = default)
    {
        var participantsTask = _participants.ListByUserIdAsync(userId, ParticipantsCap, ct);
        var elsewhereTask = _watchedTitles.ListByOwnerAsync(userId, ct);
        await Task.WhenAll(participantsTask, elsewhereTask);
        var participants = await participantsTask;
        var elsewhere = await elsewhereTask;
        var finished = await FinishedWinnerNightsAsync(participants, ct);
        if (finished.Count == 0)
            return new WatchedHistory([], elsewhere, NoRatings);

        var moviesTask = _movies.ListByIdsAsync(finished.Select(x => x.MovieId).Distinct().ToList(), ct);
        var ratingsTask = _ratings.ListByParticipantIdsAsync(participants.Select(p => p.Id).ToList(), ct);
        await Task.WhenAll(moviesTask, ratingsTask);
        return History(finished, await moviesTask, elsewhere, await ratingsTask);
    }

    public async Task<WatchedKeys> ReadKeysAsync(string userId, CancellationToken ct = default)
    {
        var participantsTask = _participants.ListByUserIdAsync(userId, ParticipantsCap, ct);
        var elsewhereTask = _watchedTitles.ListTitlesByOwnerAsync(userId, ct);
        await Task.WhenAll(participantsTask, elsewhereTask);
        var finished = await FinishedWinnerNightsAsync(await participantsTask, ct);
        IReadOnlyList<MovieListTitle> wonAtANight = finished.Count == 0
            ? []
            : await _movies.ListTitlesByIdsAsync(finished.Select(x => x.MovieId).Distinct().ToList(), ct);
        return new WatchedKeys([.. await elsewhereTask, .. wonAtANight]);
    }

    public async Task<WatchedFilm?> ReadRatedFilmAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default)
    {
        var participantsTask = _participants.ListByUserIdAsync(userId, ParticipantsCap, ct);
        var elsewhereTask = _watchedTitles.GetAsync(userId, tmdbId, mediaType, ct);
        await Task.WhenAll(participantsTask, elsewhereTask);
        var participants = await participantsTask;
        IReadOnlyList<WatchedTitle> elsewhere = await elsewhereTask is { } title ? [title] : [];
        var finished = await FinishedWinnerNightsAsync(participants, ct);
        if (finished.Count == 0)
            return new WatchedHistory([], elsewhere, NoRatings).Find(tmdbId, mediaType);

        var nightIds = finished.Select(x => x.Night.Id).Distinct().ToList();
        var proposals = await _movies.ListByEventIdsAndTmdbIdAsync(nightIds, tmdbId, mediaType, ct);
        var proposalIds = proposals.Select(movie => movie.Id).ToHashSet(StringComparer.Ordinal);
        var nightsOfTheTitle = finished
            .Where(x => proposalIds.Contains(x.MovieId))
            .Select(x => x.Night.Id)
            .ToHashSet(StringComparer.Ordinal);
        var ratings = nightsOfTheTitle.Count == 0
            ? []
            : await _ratings.ListByParticipantIdsAsync(
                participants.Where(p => nightsOfTheTitle.Contains(p.EventId)).Select(p => p.Id).ToList(),
                ct);
        return History(finished, proposals, elsewhere, ratings).Find(tmdbId, mediaType);
    }

    private async Task<List<(Event Night, string MovieId, DateTimeOffset WatchedAt)>> FinishedWinnerNightsAsync(
        IReadOnlyList<Participant> participants,
        CancellationToken ct)
    {
        if (participants.Count == 0)
            return [];

        var events = await _events.ListByIdsAsync(participants.Select(p => p.EventId).Distinct().ToList(), ct);
        return WatchedMoviesFacts.FinishedWinnerNights(events, _clock.GetUtcNow()).ToList();
    }

    private static WatchedHistory History(
        List<(Event Night, string MovieId, DateTimeOffset WatchedAt)> finished,
        IReadOnlyList<Movie> movies,
        IReadOnlyList<WatchedTitle> elsewhere,
        IReadOnlyList<MovieRating> ratings)
    {
        var movieById = movies.ToDictionary(movie => movie.Id);
        var nights = finished
            .Where(x => movieById.ContainsKey(x.MovieId))
            .Select(x => new NightViewing(movieById[x.MovieId], x.Night, x.WatchedAt))
            .ToList();
        var nightRatingByMovieId = ratings
            .GroupBy(rating => rating.MovieId)
            .ToDictionary(group => group.Key, group => group.First().Value);
        return new WatchedHistory(nights, elsewhere, nightRatingByMovieId);
    }
}
