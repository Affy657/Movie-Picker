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

        var webBase = _options.ResolvedWebBaseUrl();
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
            ogTitle = "Movie Picker — Soirée ciné";
            ogDescription = "Tu as reçu une invitation pour une soirée ciné sur Movie Picker. Ouvre le lien pour rejoindre !";
            ogImage = $"{webBase}/favicon.svg";
        }
        else
        {
            pageTitle = $"{evt.Title} — Movie Picker";
            ogTitle = $"{evt.Title} — Movie Picker";
            ogDescription = BuildRichDescription(evt);
            ogImage = await ResolveOgImageAsync(evt, apiBase, webBase, ct);
        }

        return BuildDocument(canonical, pageTitle, ogTitle, ogDescription, ogImage);
    }

    private static readonly System.Globalization.CultureInfo FrCulture =
        new("fr-FR");

    private static string BuildRichDescription(Event evt)
    {
        var dateLabel = DateOnly.TryParse(evt.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d)
            ? d.ToString("dddd d MMMM yyyy", FrCulture)
            : evt.Date;

        static string FormatTimeLabel(string time)
        {
            if (!time.Contains(':')) return time;
            if (time.EndsWith(":00")) return time[..time.IndexOf(':')] + "h";
            return time.Replace(":", "h");
        }
        var timeLabel = FormatTimeLabel(evt.Time);

        var parts = new List<string> { $"📅 {dateLabel} à {timeLabel}" };

        var theme = evt.Config?.Theme?.Trim();
        if (!string.IsNullOrWhiteSpace(theme))
            parts.Add($"🎭 {theme}");

        parts.Add("Rejoins la soirée et vote pour ton film !");
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
        const string CloseMetaTag = "\" />\n";
        var canonicalJson = JsonSerializer.Serialize(canonicalUrl);
        return
            "<!DOCTYPE html>\n"
            + "<html lang=\"fr\">\n<head>\n"
            + "<meta charset=\"utf-8\" />\n"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
            + "<meta name=\"robots\" content=\"noindex, follow\" />\n"
            + "<meta http-equiv=\"refresh\" content=\"0; url=" + H(canonicalUrl) + CloseMetaTag
            + "<title>" + H(pageTitle) + "</title>\n"
            + "<link rel=\"canonical\" href=\"" + H(canonicalUrl) + CloseMetaTag
            + "<meta property=\"og:type\" content=\"website\" />\n"
            + "<meta property=\"og:url\" content=\"" + H(canonicalUrl) + CloseMetaTag
            + "<meta property=\"og:title\" content=\"" + H(ogTitle) + CloseMetaTag
            + "<meta property=\"og:description\" content=\"" + H(ogDescription) + CloseMetaTag
            + "<meta property=\"og:image\" content=\"" + H(ogImageAbsolute) + CloseMetaTag
            + "<meta property=\"og:locale\" content=\"fr_FR\" />\n"
            + "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n"
            + "<meta name=\"twitter:title\" content=\"" + H(ogTitle) + CloseMetaTag
            + "<meta name=\"twitter:description\" content=\"" + H(ogDescription) + CloseMetaTag
            + "<meta name=\"twitter:image\" content=\"" + H(ogImageAbsolute) + CloseMetaTag
            + "</head>\n<body>\n"
            + "<p><a href=\"" + H(canonicalUrl) + "\">Ouvrir la soirée sur Movie Picker</a></p>\n"
            + "<script>location.replace(" + canonicalJson + ");</script>\n"
            + "</body>\n</html>\n";
    }
}
