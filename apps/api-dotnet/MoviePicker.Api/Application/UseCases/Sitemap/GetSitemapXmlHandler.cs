using System.Globalization;
using System.Net;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Application.UseCases.Sitemap;

public sealed class GetSitemapXmlHandler : IGetSitemapXmlHandler
{
    private const int MaxProfileUrls = 49_999;

    private readonly IUserRepository _users;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<GetSitemapXmlHandler> _logger;

    public GetSitemapXmlHandler(
        IUserRepository users,
        IOptions<MoviePickerOptions> options,
        ILogger<GetSitemapXmlHandler> logger)
    {
        _users = users;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> BuildXmlAsync(CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();

        var profiles = await _users.ListPublicProfilesAsync(MaxProfileUrls, ct);
        if (profiles.Count >= MaxProfileUrls)
        {
            _logger.LogWarning(
                "Sitemap tronqué : {Count} profils atteignent la limite de {Max} URLs. Envisager un index de sitemaps.",
                profiles.Count,
                MaxProfileUrls);
        }

        var sb = new StringBuilder();
        sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.Append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        AppendUrl(sb, $"{webBase}/", null, "weekly", "1.0");
        AppendUrl(sb, $"{webBase}/tech", null, "monthly", "0.5");
        AppendUrl(sb, $"{webBase}/soutenir", null, "monthly", "0.3");
        foreach (var profile in profiles)
        {
            var loc = $"{webBase}/u/{Uri.EscapeDataString(profile.Handle)}";
            AppendUrl(sb, loc, profile.UpdatedAt, "weekly", "0.6");
        }
        sb.Append("</urlset>\n");
        return sb.ToString();
    }

    private static void AppendUrl(
        StringBuilder sb, string loc, DateTimeOffset? lastmod, string changefreq, string priority)
    {
        sb.Append("  <url>\n");
        sb.Append("    <loc>").Append(WebUtility.HtmlEncode(loc)).Append("</loc>\n");
        if (lastmod is not null)
        {
            var stamp = lastmod.Value.UtcDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            sb.Append("    <lastmod>").Append(stamp).Append("</lastmod>\n");
        }
        sb.Append("    <changefreq>").Append(changefreq).Append("</changefreq>\n");
        sb.Append("    <priority>").Append(priority).Append("</priority>\n");
        sb.Append("  </url>\n");
    }
}
