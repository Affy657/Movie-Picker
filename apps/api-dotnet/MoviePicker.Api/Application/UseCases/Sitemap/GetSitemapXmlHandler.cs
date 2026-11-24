using System.Globalization;
using System.Net;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Application.UseCases.Sitemap;

public sealed class GetSitemapXmlHandler : IGetSitemapXmlHandler
{
    private const int SitemapUrlLimit = 50_000;
    private const string Daily = "daily";
    private const string Weekly = "weekly";
    private const string Monthly = "monthly";

    private sealed record StaticPage(string Path, string ChangeFrequency, string Priority)
    {
        public bool ChangesDaily => ChangeFrequency == Daily;
    }

    private static readonly StaticPage[] StaticPages =
    [
        new(FrontRoutes.Home, Daily, "1.0"),
        new(FrontRoutes.HowItWorks, Monthly, "0.8"),
        new(FrontRoutes.ShowcaseTrending, Daily, "0.8"),
        new(FrontRoutes.ShowcaseNowPlaying, Weekly, "0.8"),
        new(FrontRoutes.ShowcaseMostProposed, Weekly, "0.7"),
        new(FrontRoutes.MovieCollections, Monthly, "0.6"),
        new(FrontRoutes.Tech, Monthly, "0.5"),
        new(FrontRoutes.Donate, Monthly, "0.3"),
    ];

    private static readonly int MaxProfileUrls = SitemapUrlLimit - StaticPages.Length;

    private readonly IUserRepository _users;
    private readonly PublicProfileContent _profileContent;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<GetSitemapXmlHandler> _logger;
    private readonly TimeProvider _clock;

    public GetSitemapXmlHandler(
        IUserRepository users,
        PublicProfileContent profileContent,
        IOptions<MoviePickerOptions> options,
        ILogger<GetSitemapXmlHandler> logger,
        TimeProvider clock)
    {
        _users = users;
        _profileContent = profileContent;
        _options = options.Value;
        _logger = logger;
        _clock = clock;
    }

    public async Task<string> BuildXmlAsync(CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();

        var profiles = await _users.ListPublicProfilesAsync(MaxProfileUrls, ct);
        if (profiles.Count >= MaxProfileUrls)
        {
            _logger.LogWarning(
                "Sitemap truncated: {Count} profiles reach the limit of {Max} URLs, consider a sitemap index",
                profiles.Count,
                MaxProfileUrls);
        }

        var sb = new StringBuilder();
        sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.Append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        var today = _clock.GetUtcNow();
        foreach (var page in StaticPages)
            AppendUrl(sb, $"{webBase}{page.Path}", page.ChangesDaily ? today : null, page.ChangeFrequency, page.Priority);
        foreach (var profile in profiles)
        {
            if (!await _profileContent.ShowsSomethingAsync(profile, ct))
                continue;
            var loc = webBase + FrontRoutes.Profile(profile.Handle);
            AppendUrl(sb, loc, profile.UpdatedAt, Weekly, "0.6");
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
