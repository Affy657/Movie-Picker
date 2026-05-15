using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventSharePreview;

public sealed class GetEventSharePreviewHtmlHandler : IGetEventSharePreviewHtmlHandler
{
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IPosterImageStore _posterImageStore;
    private readonly MoviePickerOptions _options;

    public GetEventSharePreviewHtmlHandler(
        IEventRepository events,
        IMovieRepository movies,
        IPosterImageStore posterImageStore,
        IOptions<MoviePickerOptions> options)
    {
        _events = events;
        _movies = movies;
        _posterImageStore = posterImageStore;
        _options = options.Value;
    }

    public async Task<string> BuildHtmlAsync(string idOrSlug, string apiPublicBaseUrl, CancellationToken ct = default)
    {
        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var webBase = string.IsNullOrWhiteSpace(_options.PublicWebBaseUrl)
            ? "https://web.movie-picker.fr"
            : _options.PublicWebBaseUrl.Trim().TrimEnd('/');
        var canonical = $"{webBase}/e/{evt.Slug}";

        var apiBase = apiPublicBaseUrl.Trim().TrimEnd('/');

        var rich = evt.Config?.RichSharePreview == true;
        string ogTitle;
        string ogDescription;
        string pageTitle;
        string ogImage;

        if (!rich)
        {
            pageTitle = "Movie Picker";
            ogTitle = "Movie Picker";
            ogDescription = "Lien privé vers une soirée cinéma — ouvrez l’URL pour rejoindre l’événement.";
            ogImage = $"{webBase}/favicon.svg";
        }
        else
        {
            pageTitle = $"{evt.Title} — Movie Picker";
            ogTitle = $"{evt.Title} · Movie Picker";
            ogDescription = BuildRichDescription(evt);
            ogImage = await ResolveOgImageAsync(evt, apiBase, webBase, ct);
        }

        return BuildDocument(canonical, pageTitle, ogTitle, ogDescription, ogImage);
    }

    private static readonly System.Globalization.CultureInfo FrCulture =
        new("fr-FR");

    private static string BuildRichDescription(Event evt)
    {
        var dateLabel = DateOnly.TryParse(evt.Date, out var d)
            ? d.ToString("dddd d MMMM yyyy", FrCulture)
            : evt.Date;

        var timeLabel = evt.Time.Contains(':')
            ? evt.Time.Replace(":", "h")
            : evt.Time;

        var parts = new List<string> { $"📅 {dateLabel} à {timeLabel}" };

        var theme = evt.Config?.Theme?.Trim();
        if (!string.IsNullOrWhiteSpace(theme))
            parts.Add($"🎭 {theme}");

        parts.Add("Rejoins-nous sur Movie Picker !");
        return string.Join(" · ", parts);
    }

    private async Task<string> ResolveOgImageAsync(Event evt, string apiBase, string webBase, CancellationToken ct)
    {
        var fallback = $"{webBase}/favicon.svg";
        if (string.IsNullOrEmpty(evt.WinnerMovieId))
            return fallback;

        var wm = await _movies.GetByIdAsync(evt.WinnerMovieId, ct);
        if (wm is null || string.IsNullOrEmpty(wm.PosterPath))
            return fallback;

        if (TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(wm.PosterPath, out var pNorm))
            await _posterImageStore.RegisterTmdbSourceAsync(pNorm, ct);

        var posterOut = _posterImageStore.ToPublicPosterPath(wm.PosterPath);
        if (string.IsNullOrEmpty(posterOut) || !posterOut.StartsWith('/'))
            return fallback;

        return $"{apiBase}{posterOut}";
    }

    private static string BuildDocument(
        string canonicalUrl,
        string pageTitle,
        string ogTitle,
        string ogDescription,
        string ogImageAbsolute)
    {
        static string H(string? s) => WebUtility.HtmlEncode(s ?? string.Empty);
        var canonicalJson = JsonSerializer.Serialize(canonicalUrl);
        return
            "<!DOCTYPE html>\n"
            + "<html lang=\"fr\">\n<head>\n"
            + "<meta charset=\"utf-8\" />\n"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
            + "<meta name=\"robots\" content=\"noindex, follow\" />\n"
            + "<title>" + H(pageTitle) + "</title>\n"
            + "<link rel=\"canonical\" href=\"" + H(canonicalUrl) + "\" />\n"
            + "<meta property=\"og:type\" content=\"website\" />\n"
            + "<meta property=\"og:url\" content=\"" + H(canonicalUrl) + "\" />\n"
            + "<meta property=\"og:title\" content=\"" + H(ogTitle) + "\" />\n"
            + "<meta property=\"og:description\" content=\"" + H(ogDescription) + "\" />\n"
            + "<meta property=\"og:image\" content=\"" + H(ogImageAbsolute) + "\" />\n"
            + "<meta property=\"og:locale\" content=\"fr_FR\" />\n"
            + "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n"
            + "<meta name=\"twitter:title\" content=\"" + H(ogTitle) + "\" />\n"
            + "<meta name=\"twitter:description\" content=\"" + H(ogDescription) + "\" />\n"
            + "<meta name=\"twitter:image\" content=\"" + H(ogImageAbsolute) + "\" />\n"
            + "</head>\n<body>\n"
            + "<p><a href=\"" + H(canonicalUrl) + "\">Ouvrir la soirée sur Movie Picker</a></p>\n"
            + "<script>location.replace(" + canonicalJson + ");</script>\n"
            + "</body>\n</html>\n";
    }
}
