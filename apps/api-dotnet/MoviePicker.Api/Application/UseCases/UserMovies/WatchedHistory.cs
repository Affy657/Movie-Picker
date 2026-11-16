using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed record NightViewing(Movie Movie, Event Night, DateTimeOffset WatchedAt);

public sealed record WatchedFilm(
    int TmdbId,
    MovieMediaType MediaType,
    WatchedSource Source,
    DateTimeOffset WatchedAt,
    int? Rating,
    NightViewing? LatestNight,
    WatchedTitle? Elsewhere);

public sealed class WatchedHistory
{
    private readonly Dictionary<(int TmdbId, MovieMediaType MediaType), WatchedFilm> _byTitle;

    public WatchedHistory(
        IReadOnlyList<NightViewing> nights,
        IReadOnlyList<WatchedTitle> elsewhere,
        IReadOnlyDictionary<string, int> nightRatingByMovieId)
    {
        var elsewhereByTitle = elsewhere.ToDictionary(title => (title.TmdbId, title.MediaType));
        var films = nights
            .GroupBy(viewing => (viewing.Movie.TmdbId, viewing.Movie.MediaType))
            .Select(viewings => FromNights(viewings, elsewhereByTitle.GetValueOrDefault(viewings.Key), nightRatingByMovieId))
            .ToList();
        var nightTitles = films.Select(film => (film.TmdbId, film.MediaType)).ToHashSet();
        films.AddRange(elsewhere
            .Where(title => !nightTitles.Contains((title.TmdbId, title.MediaType)))
            .Select(FromElsewhere));

        Films = [.. films.OrderByDescending(film => film.WatchedAt)];
        _byTitle = Films.ToDictionary(film => (film.TmdbId, film.MediaType));
    }

    public IReadOnlyList<WatchedFilm> Films { get; }

    public WatchedFilm? Find(int tmdbId, MovieMediaType mediaType) => _byTitle.GetValueOrDefault((tmdbId, mediaType));

    private static WatchedFilm FromNights(
        IEnumerable<NightViewing> viewings,
        WatchedTitle? elsewhere,
        IReadOnlyDictionary<string, int> nightRatingByMovieId)
    {
        var latestFirst = viewings.OrderByDescending(viewing => viewing.WatchedAt).ToList();
        var latest = latestFirst[0];
        var nightRating = latestFirst
            .Select(viewing => nightRatingByMovieId.TryGetValue(viewing.Movie.Id, out var value) ? value : (int?)null)
            .FirstOrDefault(value => value is not null);
        return new WatchedFilm(
            latest.Movie.TmdbId,
            latest.Movie.MediaType,
            WatchedSource.Night,
            latest.WatchedAt,
            nightRating ?? elsewhere?.Rating,
            latest,
            elsewhere);
    }

    private static WatchedFilm FromElsewhere(WatchedTitle title) => new(
        title.TmdbId,
        title.MediaType,
        WatchedSource.Elsewhere,
        title.WatchedAt,
        title.Rating,
        null,
        title);
}
