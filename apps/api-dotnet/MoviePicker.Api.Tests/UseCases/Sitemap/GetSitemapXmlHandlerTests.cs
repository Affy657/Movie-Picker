using System.Xml.Linq;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Sitemap;
using MoviePicker.Api.Configuration;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Sitemap;

public sealed class GetSitemapXmlHandlerTests
{
    private static readonly XNamespace Ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private static readonly DateTimeOffset GenerationDay = new(2026, 9, 18, 8, 30, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private readonly Mock<IUserRepository> _users = new();

    private GetSitemapXmlHandler CreateSut(string webBase = "https://web.example")
    {
        var opts = Options.Create(new MoviePickerOptions { PublicWebBaseUrl = webBase });
        return new GetSitemapXmlHandler(
            _users.Object,
            opts,
            NullLogger<GetSitemapXmlHandler>.Instance,
            new FakeTimeProvider(GenerationDay));
    }

    private static string? LastmodOf(string xml, string loc) =>
        XDocument.Parse(xml).Descendants(Ns + "url")
            .Single(u => u.Element(Ns + "loc")!.Value == loc)
            .Element(Ns + "lastmod")?.Value;

    private void SetupProfiles(params PublicProfileRef[] profiles) =>
        _users.Setup(r => r.ListPublicProfilesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(profiles);

    private static List<string> Locs(string xml) =>
        XDocument.Parse(xml).Descendants(Ns + "loc").Select(e => e.Value).ToList();

    [Fact]
    public async Task BuildXmlAsync_AlwaysIncludesHomePage()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Contains("https://web.example/", Locs(xml));
        Assert.NotNull(XDocument.Parse(xml).Root);
    }

    [Fact]
    public async Task BuildXmlAsync_AlwaysIncludesDiscoverPage()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Contains("https://web.example/decouvrir", Locs(xml));
    }

    [Fact]
    public async Task BuildXmlAsync_AlwaysIncludesDonatePage()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Contains("https://web.example/soutenir", Locs(xml));
    }

    [Fact]
    public async Task BuildXmlAsync_AlwaysIncludesTechPage()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Contains("https://web.example/tech", Locs(xml));
    }

    [Fact]
    public async Task BuildXmlAsync_IncludesThePublicFilmLists()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        var locs = Locs(xml);
        Assert.Contains("https://web.example/films/tendances", locs);
        Assert.Contains("https://web.example/films/au-cinema", locs);
        Assert.Contains("https://web.example/films/les-plus-proposes", locs);
        Assert.Contains("https://web.example/films/collections", locs);
    }

    [Fact]
    public async Task BuildXmlAsync_DatesTheDailyListsFromTheClockAndLeavesStaticPagesUndated()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Equal("2026-09-18", LastmodOf(xml, "https://web.example/"));
        Assert.Equal("2026-09-18", LastmodOf(xml, "https://web.example/films/tendances"));
        Assert.Equal("2026-09-18", LastmodOf(xml, "https://web.example/films/au-cinema"));
        Assert.Null(LastmodOf(xml, "https://web.example/decouvrir"));
        Assert.Null(LastmodOf(xml, "https://web.example/films/collections"));
        Assert.Null(LastmodOf(xml, "https://web.example/tech"));
    }

    [Fact]
    public async Task BuildXmlAsync_IncludesPublicProfileUrls()
    {
        SetupProfiles(
            new PublicProfileRef("alice", new DateTimeOffset(2026, 7, 10, 0, 0, 0, TimeSpan.Zero)),
            new PublicProfileRef("bob", new DateTimeOffset(2026, 7, 12, 0, 0, 0, TimeSpan.Zero)));
        var xml = await CreateSut().BuildXmlAsync();

        var locs = Locs(xml);
        Assert.Contains("https://web.example/u/alice", locs);
        Assert.Contains("https://web.example/u/bob", locs);
        Assert.Contains("2026-07-10", xml);
    }

    [Fact]
    public async Task BuildXmlAsync_TrimsTrailingSlashOnBase()
    {
        SetupProfiles(new PublicProfileRef("alice", DateTimeOffset.UtcNow));
        var xml = await CreateSut("https://web.example/").BuildXmlAsync();

        Assert.Contains("https://web.example/u/alice", Locs(xml));
        Assert.DoesNotContain("https://web.example//u/alice", xml);
        Assert.DoesNotContain("https://web.example//", xml);
    }

    [Fact]
    public async Task BuildXmlAsync_ProducesWellFormedUrlset()
    {
        SetupProfiles(new PublicProfileRef("alice", DateTimeOffset.UtcNow));
        var xml = await CreateSut().BuildXmlAsync();

        var root = XDocument.Parse(xml).Root;
        Assert.NotNull(root);
        Assert.Equal(Ns + "urlset", root!.Name);
        Assert.Equal(9, root.Elements(Ns + "url").Count());
    }
}
