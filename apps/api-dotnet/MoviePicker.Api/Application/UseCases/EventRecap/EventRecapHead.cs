using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;

namespace MoviePicker.Api.Application.UseCases.EventRecap;

public sealed record EventRecapPreview(
    string Canonical,
    string FallbackUrl,
    string Title,
    string Description,
    string ImageUrl,
    string ImageAlt = EventRecapPreview.SiteName)
{
    public const string SiteName = "Movie Picker";

    public static EventRecapPreview Generic(string webBase) => new(
        $"{webBase}/",
        $"{webBase}/",
        SiteName,
        "Choisissez votre prochain film ensemble : chacun propose, tout le monde vote, la roue tranche.",
        $"{webBase}/og-image.png");

    public string DocumentTitle => Title == SiteName ? SiteName : $"{Title} | {SiteName}";
}

public static partial class EventRecapHead
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

    public static string IntoShell(string shell, EventRecapPreview preview)
    {
        var stripped = JsonLd().Replace(CanonicalLink().Replace(SocialMeta().Replace(shell, string.Empty), string.Empty), string.Empty);
        var head = HeadTags(preview);
        var title = TitleTag().Match(stripped);
        if (title.Success)
            return stripped[..title.Index] + head.TrimEnd('\n') + stripped[(title.Index + title.Length)..];

        var headEnd = stripped.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return headEnd < 0 ? head + stripped : stripped[..headEnd] + head + stripped[headEnd..];
    }

    public static string StandaloneDocument(EventRecapPreview preview)
    {
        var target = H(preview.FallbackUrl);
        return
            "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"utf-8\" />\n"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
            + "<meta http-equiv=\"refresh\" content=\"0; url=" + target + CloseTag
            + HeadTags(preview)
            + "</head>\n<body>\n<p><a href=\"" + target + "\">Ouvrir sur Movie Picker</a></p>\n</body>\n</html>\n";
    }

    private static string HeadTags(EventRecapPreview preview)
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
            .Append("<meta property=\"og:site_name\" content=\"").Append(EventRecapPreview.SiteName).Append(CloseTag)
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
