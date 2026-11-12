using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public sealed record ShareDocument(int StatusCode, string Html);

public sealed record SharePreview(
    string Canonical,
    string FallbackUrl,
    string Title,
    string Description,
    string ImageUrl,
    string ImageAlt = SharePreview.SiteName)
{
    public const string SiteName = "Movie Picker";

    public static SharePreview Generic(string webBase) => new(
        $"{webBase}/",
        $"{webBase}/",
        SiteName,
        "Choisissez votre prochain film ensemble : chacun propose, tout le monde vote, la roue tranche.",
        SiteImage(webBase));

    public static string SiteImage(string webBase) => $"{webBase}/og-image.png";

    public string DocumentTitle => Title == SiteName ? SiteName : $"{Title} | {SiteName}";
}

public static class SharePreviewContent
{
    public static readonly CultureInfo French = new("fr-FR");

    public static string Day(string date) =>
        DateOnly.TryParse(date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            ? day.ToString("dddd d MMMM yyyy", French)
            : date;

    public static string Hour(string time)
    {
        if (!time.Contains(':'))
            return time;
        return time.EndsWith(":00", StringComparison.Ordinal)
            ? time[..time.IndexOf(':')] + "h"
            : time.Replace(':', 'h');
    }

    public static string Film(Movie movie) =>
        string.IsNullOrWhiteSpace(movie.Year) ? movie.Title : $"{movie.Title} ({movie.Year})";

    public static Task<string> PosterOrAsync(
        IPosterImageStore posters,
        Movie movie,
        string apiBase,
        string fallback,
        CancellationToken ct) =>
        PosterOrAsync(posters, movie.PosterPath, apiBase, fallback, ct);

    public static async Task<string> PosterOrAsync(
        IPosterImageStore posters,
        string? posterPath,
        string apiBase,
        string fallback,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(posterPath))
            return fallback;

        var publicPath = await posters.ToStoredPosterPathAsync(posterPath, ct);
        if (string.IsNullOrEmpty(publicPath) || !publicPath.StartsWith('/'))
            return fallback;

        return $"{apiBase}{publicPath}";
    }
}

public static partial class SharePreviewHead
{
    private const string CloseTag = "\" />\n";
    private static readonly HtmlEncoder Encoder = HtmlEncoder.Create(UnicodeRanges.All);

    [GeneratedRegex("<meta\\b[^>]*\\b(?:property|name)=\"(?:og:[^\"]*|twitter:[^\"]*|description|robots)\"[^>]*>\\s*")]
    private static partial Regex SocialMeta();

    [GeneratedRegex("<link\\b[^>]*\\brel=\"canonical\"[^>]*>\\s*")]
    private static partial Regex CanonicalLink();

    [GeneratedRegex("<script\\b[^>]*\\btype=\"application/ld\\+json\"[^>]*>.*?</script>\\s*", RegexOptions.Singleline)]
    private static partial Regex JsonLd();

    [GeneratedRegex("<title>.*?</title>", RegexOptions.Singleline)]
    private static partial Regex TitleTag();

    public static string Render(string? shell, SharePreview preview) =>
        shell is null ? StandaloneDocument(preview) : IntoShell(shell, preview);

    public static string IntoShell(string shell, SharePreview preview)
    {
        var stripped = JsonLd().Replace(CanonicalLink().Replace(SocialMeta().Replace(shell, string.Empty), string.Empty), string.Empty);
        var head = HeadTags(preview);
        var title = TitleTag().Match(stripped);
        if (title.Success)
            return stripped[..title.Index] + head.TrimEnd('\n') + stripped[(title.Index + title.Length)..];

        var headEnd = stripped.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return headEnd < 0 ? head + stripped : stripped[..headEnd] + head + stripped[headEnd..];
    }

    public static string StandaloneDocument(SharePreview preview)
    {
        var target = H(preview.FallbackUrl);
        return
            "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"utf-8\" />\n"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
            + "<meta http-equiv=\"refresh\" content=\"0; url=" + target + CloseTag
            + HeadTags(preview)
            + "</head>\n<body>\n<p><a href=\"" + target + "\">Ouvrir sur Movie Picker</a></p>\n</body>\n</html>\n";
    }

    private static string HeadTags(SharePreview preview)
    {
        var title = H(preview.Title);
        var description = H(preview.Description);
        var image = H(preview.ImageUrl);
        var imageAlt = H(preview.ImageAlt);
        var canonical = H(preview.Canonical);
        return new StringBuilder()
            .Append("<title>").Append(H(preview.DocumentTitle)).Append("</title>\n")
            .Append("<meta name=\"description\" content=\"").Append(description).Append(CloseTag)
            .Append("<meta name=\"robots\" content=\"noindex, nofollow\" />\n")
            .Append("<link rel=\"canonical\" href=\"").Append(canonical).Append(CloseTag)
            .Append("<meta property=\"og:site_name\" content=\"").Append(SharePreview.SiteName).Append(CloseTag)
            .Append("<meta property=\"og:type\" content=\"website\" />\n")
            .Append("<meta property=\"og:url\" content=\"").Append(canonical).Append(CloseTag)
            .Append("<meta property=\"og:title\" content=\"").Append(title).Append(CloseTag)
            .Append("<meta property=\"og:description\" content=\"").Append(description).Append(CloseTag)
            .Append("<meta property=\"og:image\" content=\"").Append(image).Append(CloseTag)
            .Append("<meta property=\"og:image:alt\" content=\"").Append(imageAlt).Append(CloseTag)
            .Append("<meta property=\"og:locale\" content=\"fr_FR\" />\n")
            .Append("<meta name=\"twitter:card\" content=\"summary_large_image\" />\n")
            .Append("<meta name=\"twitter:title\" content=\"").Append(title).Append(CloseTag)
            .Append("<meta name=\"twitter:description\" content=\"").Append(description).Append(CloseTag)
            .Append("<meta name=\"twitter:image\" content=\"").Append(image).Append(CloseTag)
            .Append("<meta name=\"twitter:image:alt\" content=\"").Append(imageAlt).Append(CloseTag)
            .ToString();
    }

    private static string H(string value) => Encoder.Encode(value);
}
