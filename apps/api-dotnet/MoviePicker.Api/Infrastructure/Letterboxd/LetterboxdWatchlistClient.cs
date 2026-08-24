using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Letterboxd;

public sealed partial class LetterboxdWatchlistClient : ILetterboxdWatchlistClient
{
    private const int MaxPages = 40;

    private readonly HttpClient _http;
    private readonly ILogger<LetterboxdWatchlistClient> _logger;

    public LetterboxdWatchlistClient(HttpClient http, ILogger<LetterboxdWatchlistClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<LetterboxdWatchlistSnapshot> GetWatchlistAsync(
        string username,
        CancellationToken ct = default)
    {
        var normalized = NormalizeUsername(username);
        if (normalized is null)
            return LetterboxdWatchlistSnapshot.Failed();

        var films = new List<LetterboxdFilm>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var expected = -1;

        for (var page = 1; page <= MaxPages; page++)
        {
            var outcome = await ReadWatchlistPageAsync(normalized, page, expected, films, seen, ct);
            if (outcome.Failed)
                return LetterboxdWatchlistSnapshot.Failed();
            expected = outcome.Expected;
            if (outcome.Done)
                break;
        }

        if (films.Count != expected)
        {
            _logger.LogWarning(
                "Watchlist Letterboxd incomplète pour {Username} : {Collected} film(s) lu(s) sur {Expected} annoncé(s)",
                normalized,
                films.Count,
                expected);
            return LetterboxdWatchlistSnapshot.Failed();
        }

        return new LetterboxdWatchlistSnapshot(films, true);
    }

    private readonly record struct WatchlistPageOutcome(bool Failed, bool Done, int Expected);

    private async Task<WatchlistPageOutcome> ReadWatchlistPageAsync(
        string username,
        int page,
        int expected,
        List<LetterboxdFilm> films,
        HashSet<string> seen,
        CancellationToken ct)
    {
        var html = await FetchPageAsync(username, page, ct);
        if (html is null)
            return new WatchlistPageOutcome(true, true, expected);

        if (page == 1)
        {
            expected = ParseTotalEntries(html) ?? -1;
            if (expected < 0)
            {
                _logger.LogWarning(
                    "Watchlist Letterboxd illisible pour {Username} : compteur d'entrées introuvable",
                    username);
                return new WatchlistPageOutcome(true, true, expected);
            }

            if (expected == 0)
                return new WatchlistPageOutcome(false, true, 0);
        }

        var pageFilms = ParseFilms(html);
        if (pageFilms.Count == 0)
            return new WatchlistPageOutcome(false, true, expected);

        foreach (var film in pageFilms)
        {
            if (seen.Add(film.Slug))
                films.Add(film);
        }

        return new WatchlistPageOutcome(false, films.Count >= expected, expected);
    }

    private async Task<string?> FetchPageAsync(string username, int page, CancellationToken ct)
    {
        var url = page == 1
            ? $"https://letterboxd.com/{username}/watchlist/"
            : $"https://letterboxd.com/{username}/watchlist/page/{page}/";

        try
        {
            return await _http.GetStringAsync(url, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                ex,
                "Échec de récupération de la watchlist Letterboxd pour {Username} (page {Page})",
                username,
                page);
            return null;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(
                ex,
                "Délai dépassé sur la watchlist Letterboxd pour {Username} (page {Page})",
                username,
                page);
            return null;
        }
    }

    private static int? ParseTotalEntries(string html)
    {
        var match = TotalEntriesRegex().Match(html);
        if (!match.Success)
            return null;
        return int.TryParse(match.Groups[1].Value, out var total) ? total : null;
    }

    private static List<LetterboxdFilm> ParseFilms(string html)
    {
        var films = new List<LetterboxdFilm>();
        foreach (var component in FilmComponentRegex().Matches(html).Cast<Match>())
        {
            var tag = component.Value;
            var slug = SlugRegex().Match(tag).Groups[1].Value.Trim();
            var displayName = WebUtility.HtmlDecode(DisplayNameRegex().Match(tag).Groups[1].Value).Trim();
            if (slug.Length == 0 || displayName.Length == 0)
                continue;

            var titleYear = TitleYearRegex().Match(displayName);
            films.Add(titleYear.Success
                ? new LetterboxdFilm(slug, titleYear.Groups[1].Value.Trim(), titleYear.Groups[2].Value)
                : new LetterboxdFilm(slug, displayName, string.Empty));
        }

        return films;
    }

    private static string? NormalizeUsername(string? username)
    {
        if (string.IsNullOrWhiteSpace(username))
            return null;
        var trimmed = username.Trim();
        return IsValidUsername(trimmed) ? trimmed : null;
    }

    private static bool IsValidUsername(string username) =>
        username.Length is > 0 and <= 40
        && username.All(c => char.IsAsciiLetterOrDigit(c) || c is '_' or '-');

    [GeneratedRegex("<div[^>]*data-item-full-display-name=\"[^\"]*\"[^>]*>")]
    private static partial Regex FilmComponentRegex();

    [GeneratedRegex("data-item-slug=\"([^\"]*)\"")]
    private static partial Regex SlugRegex();

    [GeneratedRegex("data-item-full-display-name=\"([^\"]*)\"")]
    private static partial Regex DisplayNameRegex();

    [GeneratedRegex("data-num-entries=\"(\\d+)\"")]
    private static partial Regex TotalEntriesRegex();

    [GeneratedRegex(@"^(.*?)\s*\((\d{4})(?:[-–]\d*)?\)$")]
    private static partial Regex TitleYearRegex();
}
