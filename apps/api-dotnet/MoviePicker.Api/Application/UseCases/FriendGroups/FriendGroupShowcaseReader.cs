using System.Globalization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class FriendGroupShowcaseReader
{
    private const int UsualEveningMinimum = 2;

    private static readonly IReadOnlyDictionary<string, FriendGroupCoverResponse> NoCovers =
        new Dictionary<string, FriendGroupCoverResponse>();

    private readonly IMovieRepository _movies;
    private readonly IMovieRatingRepository _ratings;
    private readonly ITmdbMovieSearch _tmdb;

    public FriendGroupShowcaseReader(IMovieRepository movies, IMovieRatingRepository ratings, ITmdbMovieSearch tmdb)
    {
        _movies = movies;
        _ratings = ratings;
        _tmdb = tmdb;
    }

    public static IReadOnlyList<Event> HeldNights(IEnumerable<Event> nights, DateTimeOffset now) =>
        nights
            .Where(night => night.IsFinished(now) && night.HasWinner)
            .OrderByDescending(night => night.Date, StringComparer.Ordinal)
            .ThenByDescending(night => night.Time, StringComparer.Ordinal)
            .ToList();

    public async Task<FriendGroupStatsResponse> StatsAsync(IReadOnlyList<Event> held, CancellationToken ct)
    {
        if (held.Count == 0)
            return FriendGroupStatsResponse.None;

        var filmIds = held.SelectMany(night => night.GetWinnerMovieIds()).ToHashSet(StringComparer.Ordinal);
        var ratings = await _ratings.ListByEventIdsAsync(held.Select(night => night.Id).ToList(), ct);
        var filmAverages = ratings
            .Where(rating => filmIds.Contains(rating.MovieId))
            .GroupBy(rating => rating.MovieId, StringComparer.Ordinal)
            .Select(perFilm => perFilm.Average(rating => rating.Value))
            .ToList();

        return new FriendGroupStatsResponse
        {
            NightCount = held.Count,
            FilmCount = filmIds.Count,
            FirstNightDate = held[^1].Date,
            AverageRating = filmAverages.Count == 0 ? null : Math.Round(filmAverages.Average(), 2),
            UsualWeekday = UsualWeekday(held)
        };
    }

    public async Task<IReadOnlyDictionary<string, FriendGroupCoverResponse>> CoversAsync(
        IReadOnlyList<Event> lastNights,
        CancellationToken ct)
    {
        if (lastNights.Count == 0)
            return NoCovers;

        var filmIds = lastNights.ToDictionary(night => night.Id, night => night.GetWinnerMovieIds()[0], StringComparer.Ordinal);
        var films = (await _movies.ListByIdsAsync(filmIds.Values.Distinct(StringComparer.Ordinal).ToList(), ct))
            .ToDictionary(film => film.Id, StringComparer.Ordinal);
        var covers = await Task.WhenAll(filmIds.Select(async pair =>
            (NightId: pair.Key, Cover: films.TryGetValue(pair.Value, out var film) ? await CoverOfAsync(film, ct) : null)));
        return covers
            .Where(found => found.Cover is not null)
            .ToDictionary(found => found.NightId, found => found.Cover!, StringComparer.Ordinal);
    }

    private async Task<FriendGroupCoverResponse?> CoverOfAsync(Movie film, CancellationToken ct)
    {
        if (film.TmdbId <= 0)
            return null;

        TmdbMovieDetails? details;
        try
        {
            details = await _tmdb.GetDetailsAsync(film.TmdbId, film.MediaType, ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }

        if (string.IsNullOrEmpty(details?.BackdropUrl))
            return null;

        return new FriendGroupCoverResponse
        {
            TmdbId = film.TmdbId,
            MediaType = film.MediaType,
            Title = film.Title,
            BackdropUrl = details.BackdropUrl
        };
    }

    private static int? UsualWeekday(IReadOnlyList<Event> held)
    {
        var byDay = held
            .Select(night => DateOnly.TryParseExact(night.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
                ? date.DayOfWeek
                : (DayOfWeek?)null)
            .OfType<DayOfWeek>()
            .GroupBy(day => day)
            .Select(perDay => (Day: perDay.Key, Count: perDay.Count()))
            .OrderByDescending(perDay => perDay.Count)
            .ToList();

        if (byDay.Count == 0 || byDay[0].Count < UsualEveningMinimum)
            return null;
        if (byDay.Count > 1 && byDay[1].Count == byDay[0].Count)
            return null;
        return (int)byDay[0].Day;
    }
}
