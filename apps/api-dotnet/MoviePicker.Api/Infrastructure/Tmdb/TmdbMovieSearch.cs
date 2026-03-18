using System.Text.Json;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class TmdbMovieSearch : ITmdbMovieSearch
{
    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;

    public TmdbMovieSearch(HttpClient http, IOptions<MoviePickerOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new InvalidOperationException("TMDB_API_KEY manquante");

        var q = Uri.EscapeDataString(query.Trim());
        if (q.Length == 0)
            return Array.Empty<TmdbSearchItem>();

        var url = $"https://api.themoviedb.org/3/search/movie?api_key={_options.TmdbApiKey}&query={q}&language=fr-FR";
        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("results", out var results))
            return Array.Empty<TmdbSearchItem>();

        const string posterBase = "https://image.tmdb.org/t/p/w154";
        var list = new List<TmdbSearchItem>();
        var n = 0;
        foreach (var item in results.EnumerateArray())
        {
            if (n++ >= 20) break;
            var id = item.GetProperty("id").GetInt32();
            var title = item.TryGetProperty("title", out var t) ? t.GetString() ?? string.Empty : string.Empty;
            if (string.IsNullOrEmpty(title) && item.TryGetProperty("name", out var name))
                title = name.GetString() ?? string.Empty;
            var date = item.TryGetProperty("release_date", out var rd)
                ? rd.GetString()
                : item.TryGetProperty("first_air_date", out var fad) ? fad.GetString() : null;
            var year = date is { Length: >= 4 } ? date[..4] : string.Empty;
            string? posterPath = null;
            if (item.TryGetProperty("poster_path", out var pp) && pp.ValueKind == JsonValueKind.String)
            {
                var p = pp.GetString();
                if (!string.IsNullOrEmpty(p))
                    posterPath = posterBase + p;
            }

            list.Add(new TmdbSearchItem(id, title, year, posterPath));
        }

        return list;
    }
}
