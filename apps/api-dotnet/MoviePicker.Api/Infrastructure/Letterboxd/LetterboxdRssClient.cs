using System.Xml;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Letterboxd;

public sealed class LetterboxdRssClient : ILetterboxdRssClient
{
    private static readonly XNamespace LetterboxdNs = "https://letterboxd.com";
    private static readonly XNamespace TmdbNs = "https://themoviedb.org";

    private readonly HttpClient _http;
    private readonly ILogger<LetterboxdRssClient> _logger;

    public LetterboxdRssClient(HttpClient http, ILogger<LetterboxdRssClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<IReadOnlyList<LetterboxdDiaryEntry>> GetRecentDiaryAsync(
        string username,
        CancellationToken ct = default)
    {
        var normalized = NormalizeUsername(username);
        if (normalized is null)
            return [];

        string xml;
        try
        {
            xml = await _http.GetStringAsync($"https://letterboxd.com/{normalized}/rss/", ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Échec de récupération du flux RSS Letterboxd pour {Username}", normalized);
            return [];
        }

        XDocument doc;
        try
        {
            doc = XDocument.Parse(xml);
        }
        catch (XmlException ex)
        {
            _logger.LogWarning(ex, "Flux RSS Letterboxd invalide pour {Username}", normalized);
            return [];
        }

        return doc.Descendants("item")
            .Select(ParseEntry)
            .Where(e => e is not null)
            .Select(e => e!)
            .ToList();
    }

    private static LetterboxdDiaryEntry? ParseEntry(XElement item)
    {
        var title = item.Element(LetterboxdNs + "filmTitle")?.Value;
        if (string.IsNullOrWhiteSpace(title))
            return null;

        var year = item.Element(LetterboxdNs + "filmYear")?.Value?.Trim() ?? string.Empty;
        var tmdbRaw = item.Element(TmdbNs + "movieId")?.Value;
        var tmdbId = int.TryParse(tmdbRaw, out var parsed) ? parsed : (int?)null;

        return new LetterboxdDiaryEntry(tmdbId, title.Trim(), year);
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
        && username.All(c => char.IsLetterOrDigit(c) || c is '_' or '-');
}
