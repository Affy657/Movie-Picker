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
    private readonly ITmdbMovieSearch _tmdb;

    public FriendGroupShowcaseReader(IMovieRepository movies, ITmdbMovieSearch tmdb)
    {
        _movies = movies;
        _tmdb = tmdb;
    }

    public static FriendGroupStatsResponse Stats(HeldGroupNightTally? tally)
    {
        if (tally is null)
            return FriendGroupStatsResponse.None;

        return new FriendGroupStatsResponse
        {
            NightCount = tally.NightCount,
            FilmCount = tally.FilmCount,
            FirstNightDate = tally.FirstNightDate,
            AverageRating = tally.AverageFilmRating is { } average ? Math.Round(average, 2) : null,
            UsualWeekday = UsualWeekday(tally.NightsByWeekday)
        };
    }

    public async Task<IReadOnlyDictionary<string, FriendGroupCoverResponse>> CoversAsync(
        IReadOnlyList<HeldGroupNight> lastNights,
        CancellationToken ct)
    {
        if (lastNights.Count == 0)
            return NoCovers;

        var filmIds = lastNights.ToDictionary(night => night.Id, night => night.WinnerMovieIds[0], StringComparer.Ordinal);
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

    private static int? UsualWeekday(IReadOnlyDictionary<DayOfWeek, int> nightsByWeekday)
    {
        var byDay = nightsByWeekday
            .Where(perDay => perDay.Value > 0)
            .Select(perDay => (Day: perDay.Key, Count: perDay.Value))
            .OrderByDescending(perDay => perDay.Count)
            .ToList();

        if (byDay.Count == 0 || byDay[0].Count < UsualEveningMinimum)
            return null;
        if (byDay.Count > 1 && byDay[1].Count == byDay[0].Count)
            return null;
        return (int)byDay[0].Day;
    }
}
