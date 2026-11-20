using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Letterboxd;

public sealed partial class LetterboxdWatchlistClient : ILetterboxdWatchlistClient
{
    private const int MaxPages = 40;
    private const string SiteRoot = "https://letterboxd.com/";

    private static readonly FilmList Watchlist = new("watchlist", "watchlist/", ParseWatchlistTotal, NeverEmptyWithoutCounter);
    private static readonly FilmList WatchedFilms = new("watched films", "films/", ParseWatchedTotal, IsEmptyFilmsPageOf);

    private readonly HttpClient _http;
    private readonly ILogger<LetterboxdWatchlistClient> _logger;

    public LetterboxdWatchlistClient(HttpClient http, ILogger<LetterboxdWatchlistClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public static void ConfigureHttpClient(HttpClient client)
    {
        client.Timeout = TimeSpan.FromSeconds(15);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
    }

    public Task<LetterboxdFilmsSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default) =>
        ReadListAsync(Watchlist, username, ct);

    public async Task<LetterboxdFilmsSnapshot> GetWatchedFilmsAsync(string username, CancellationToken ct = default)
    {
        var snapshot = await ReadListAsync(WatchedFilms, username, ct);
        if (!snapshot.IsComplete || snapshot.Films.Count == 0)
            return snapshot;

        var diary = await ReadDiaryAsync(NormalizeUsername(username)!, ct);
        if (diary.Count == 0)
            return snapshot;

        var watchedOn = diary.ToDictionary(entry => entry.Slug, entry => entry.WatchedOn, StringComparer.OrdinalIgnoreCase);
        var films = snapshot.Films
            .Select(film => watchedOn.TryGetValue(film.Slug, out var date) ? film with { WatchedOn = date } : film)
            .ToList();
        if (snapshot.IsTruncated)
        {
            var read = films.Select(film => film.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);
            films.AddRange(diary
                .Where(entry => entry.Title.Length > 0 && !read.Contains(entry.Slug))
                .Select(entry => new LetterboxdFilm(entry.Slug, entry.Title, entry.Year, entry.Rating, entry.WatchedOn)));
        }

        return snapshot with { Films = films };
    }

    private sealed record FilmList(
        string Name,
        string Path,
        Func<string, int?> ParseTotal,
        Func<string, string, bool> IsEmptyWithoutCounter);

    private sealed record DiaryEntry(string Slug, string Title, string Year, int? Rating, DateOnly WatchedOn);

    private readonly record struct PageOutcome(
        bool Failed,
        bool Done,
        int Expected,
        bool EmptyWithoutCounter = false,
        bool Unreachable = false);

    private async Task<LetterboxdFilmsSnapshot> ReadListAsync(FilmList list, string username, CancellationToken ct)
    {
        var normalized = NormalizeUsername(username);
        if (normalized is null)
            return LetterboxdFilmsSnapshot.Failed();

        var films = new List<LetterboxdFilm>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var expected = -1;

        for (var page = 1; page <= MaxPages; page++)
        {
            var outcome = await ReadPageAsync(list, normalized, page, expected, films, seen, ct);
            if (outcome.Unreachable && page > 1)
                return KeepWhatWasRead(list, normalized, films, expected, page);
            if (outcome.Failed)
                return LetterboxdFilmsSnapshot.Failed();
            if (outcome.EmptyWithoutCounter)
                return LetterboxdFilmsSnapshot.EmptyWithoutCounter();
            expected = outcome.Expected;
            if (outcome.Done)
                return Conclude(list, normalized, films, expected);
        }

        _logger.LogInformation(
            "Letterboxd {List} of {Username} read up to the {MaxPages}-page budget: {Collected} film(s) out of {Expected}",
            list.Name,
            normalized,
            MaxPages,
            films.Count,
            expected);
        return LetterboxdFilmsSnapshot.Truncated(films, expected);
    }

    private LetterboxdFilmsSnapshot KeepWhatWasRead(FilmList list, string username, List<LetterboxdFilm> films, int expected, int page)
    {
        _logger.LogInformation(
            "Letterboxd {List} of {Username} not served from page {Page}: {Collected} film(s) kept out of {Expected}",
            list.Name,
            username,
            page,
            films.Count,
            expected);
        return LetterboxdFilmsSnapshot.Truncated(films, expected);
    }

    private LetterboxdFilmsSnapshot Conclude(FilmList list, string username, List<LetterboxdFilm> films, int expected)
    {
        if (films.Count == expected)
            return new LetterboxdFilmsSnapshot(films, true);

        _logger.LogWarning(
            "Incomplete Letterboxd {List} for {Username}: {Collected} film(s) read out of {Expected} announced",
            list.Name,
            username,
            films.Count,
            expected);
        return LetterboxdFilmsSnapshot.Failed();
    }

    private async Task<PageOutcome> ReadPageAsync(
        FilmList list,
        string username,
        int page,
        int expected,
        List<LetterboxdFilm> films,
        HashSet<string> seen,
        CancellationToken ct)
    {
        var html = await FetchAsync(PageUrl(list, username, page), list.Name, username, page, ct);
        if (html is null)
            return new PageOutcome(true, true, expected, Unreachable: true);

        if (page == 1)
        {
            expected = list.ParseTotal(html) ?? -1;
            if (expected < 0 && list.IsEmptyWithoutCounter(html, username))
                return new PageOutcome(false, true, 0, EmptyWithoutCounter: true);
            if (expected < 0)
            {
                _logger.LogWarning(
                    "Unreadable Letterboxd {List} for {Username}: entry counter not found",
                    list.Name,
                    username);
                return new PageOutcome(true, true, expected);
            }

            if (expected == 0)
                return new PageOutcome(false, true, 0);
        }

        var pageFilms = ParseFilms(html);
        if (pageFilms.Count == 0)
            return new PageOutcome(false, true, expected);

        var before = films.Count;
        foreach (var film in pageFilms)
        {
            if (seen.Add(film.Slug))
                films.Add(film);
        }

        if (films.Count == before)
        {
            _logger.LogWarning(
                "Letterboxd {List} page {Page} of {Username} only repeats films already read",
                list.Name,
                page,
                username);
            return new PageOutcome(true, true, expected);
        }

        return new PageOutcome(false, films.Count >= expected, expected);
    }

    private static string PageUrl(FilmList list, string username, int page) =>
        page == 1
            ? $"{SiteRoot}{username}/{list.Path}"
            : $"{SiteRoot}{username}/{list.Path}page/{page}/";

    private async Task<List<DiaryEntry>> ReadDiaryAsync(string username, CancellationToken ct)
    {
        var diary = new List<DiaryEntry>();
        var feed = await FetchAsync($"{SiteRoot}{username}/rss/", "diary feed", username, 1, ct);
        if (feed is null)
            return diary;

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in RssItemRegex().Matches(feed).Cast<Match>().Select(match => match.Value))
        {
            var slug = RssFilmSlugRegex().Match(item).Groups[1].Value;
            var date = RssWatchedDateRegex().Match(item).Groups[1].Value;
            if (slug.Length > 0
                && DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
                && seen.Add(slug))
            {
                diary.Add(new DiaryEntry(
                    slug,
                    WebUtility.HtmlDecode(RssFilmTitleRegex().Match(item).Groups[1].Value).Trim(),
                    RssFilmYearRegex().Match(item).Groups[1].Value,
                    ParseMemberRating(RssMemberRatingRegex().Match(item).Groups[1].Value),
                    day));
            }
        }

        return diary;
    }

    private static int? ParseMemberRating(string stars)
    {
        if (!double.TryParse(stars, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value))
            return null;
        var halfStars = (int)Math.Round(value * 2);
        return halfStars is >= 1 and <= 10 ? halfStars : null;
    }

    private async Task<string?> FetchAsync(string url, string what, string username, int page, CancellationToken ct)
    {
        var level = page == 1 ? LogLevel.Warning : LogLevel.Information;
        try
        {
            return await _http.GetStringAsync(url, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.Log(
                level,
                ex,
                "Failed to fetch the Letterboxd {List} for {Username} (page {Page})",
                what,
                username,
                page);
            return null;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.Log(
                level,
                ex,
                "Timeout on the Letterboxd {List} for {Username} (page {Page})",
                what,
                username,
                page);
            return null;
        }
    }

    private static bool NeverEmptyWithoutCounter(string html, string username) => false;

    private static bool IsEmptyFilmsPageOf(string html, string username)
    {
        if (FilmComponentRegex().IsMatch(html))
            return false;
        var body = BodyTagRegex().Match(html).Value;
        return WatchedFilmsBodyClassRegex().IsMatch(body)
            && OwnerRegex().Match(body).Groups[1].Value.Equals(username, StringComparison.OrdinalIgnoreCase);
    }

    private static int? ParseWatchlistTotal(string html)
    {
        var match = TotalEntriesRegex().Match(html);
        if (!match.Success)
            return null;
        return int.TryParse(match.Groups[1].Value, out var total) ? total : null;
    }

    private static int? ParseWatchedTotal(string html)
    {
        var match = WatchedTotalRegex().Match(html);
        if (!match.Success)
            return null;
        var digits = new string(match.Groups[1].Value.Where(char.IsAsciiDigit).ToArray());
        return int.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture, out var total) ? total : null;
    }

    private static List<LetterboxdFilm> ParseFilms(string html)
    {
        var films = new List<LetterboxdFilm>();
        var components = FilmComponentRegex().Matches(html);
        for (var index = 0; index < components.Count; index++)
        {
            var tag = components[index].Value;
            var slug = SlugRegex().Match(tag).Groups[1].Value.Trim();
            var displayName = WebUtility.HtmlDecode(DisplayNameRegex().Match(tag).Groups[1].Value).Trim();
            if (slug.Length == 0 || displayName.Length == 0)
                continue;

            var rating = ParseRating(html, components[index], index + 1 < components.Count ? components[index + 1] : null);
            var titleYear = TitleYearRegex().Match(displayName);
            films.Add(titleYear.Success
                ? new LetterboxdFilm(slug, titleYear.Groups[1].Value.Trim(), titleYear.Groups[2].Value, rating)
                : new LetterboxdFilm(slug, displayName, string.Empty, rating));
        }

        return films;
    }

    private static int? ParseRating(string html, Match component, Match? next)
    {
        var start = component.Index + component.Length;
        var end = next?.Index ?? html.Length;
        var itemEnd = html.IndexOf("</li>", start, end - start, StringComparison.Ordinal);
        var viewingData = html.AsSpan(start, (itemEnd >= 0 ? itemEnd : end) - start).ToString();
        var rated = RatedRegex().Match(viewingData);
        return rated.Success && int.TryParse(rated.Groups[1].Value, out var halfStars) && halfStars is >= 1 and <= 10
            ? halfStars
            : null;
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

    [GeneratedRegex("class=\"section-heading\"[^>]*>\\s*<span[^>]*\\btitle=\"([\\d,.]+)(?:&nbsp;|\\s)films?\"")]
    private static partial Regex WatchedTotalRegex();

    [GeneratedRegex("<body\\b[^>]*>")]
    private static partial Regex BodyTagRegex();

    [GeneratedRegex("\\bclass=\"[^\"]*\\bfilms-watched\\b[^\"]*\"")]
    private static partial Regex WatchedFilmsBodyClassRegex();

    [GeneratedRegex("\\bdata-owner=\"([^\"]*)\"")]
    private static partial Regex OwnerRegex();

    [GeneratedRegex("\\brated-(\\d{1,2})\\b")]
    private static partial Regex RatedRegex();

    [GeneratedRegex("<item>.*?</item>", RegexOptions.Singleline)]
    private static partial Regex RssItemRegex();

    [GeneratedRegex("<link>https://letterboxd\\.com/[^/<]+/film/([^/<]+)/")]
    private static partial Regex RssFilmSlugRegex();

    [GeneratedRegex("<letterboxd:watchedDate>(\\d{4}-\\d{2}-\\d{2})</letterboxd:watchedDate>")]
    private static partial Regex RssWatchedDateRegex();

    [GeneratedRegex("<letterboxd:filmTitle>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</letterboxd:filmTitle>", RegexOptions.Singleline)]
    private static partial Regex RssFilmTitleRegex();

    [GeneratedRegex("<letterboxd:filmYear>(\\d{4})</letterboxd:filmYear>")]
    private static partial Regex RssFilmYearRegex();

    [GeneratedRegex("<letterboxd:memberRating>([\\d.]+)</letterboxd:memberRating>")]
    private static partial Regex RssMemberRatingRegex();

    [GeneratedRegex(@"^(.*?)\s*\((\d{4})(?:[-–]\d*)?\)$")]
    private static partial Regex TitleYearRegex();
}
