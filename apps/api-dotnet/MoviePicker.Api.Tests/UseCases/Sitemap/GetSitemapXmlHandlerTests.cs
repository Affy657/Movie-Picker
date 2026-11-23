using System.Xml.Linq;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Sitemap;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
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
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IMovieListRepository> _lists = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();

    public GetSitemapXmlHandlerTests() =>
        _participants.Setup(r => r.ListByUserIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

    private GetSitemapXmlHandler CreateSut(string webBase = "https://web.example")
    {
        var opts = Options.Create(new MoviePickerOptions { PublicWebBaseUrl = webBase });
        return new GetSitemapXmlHandler(
            _users.Object,
            _participants.Object,
            _lists.Object,
            _watchlist.Object,
            opts,
            NullLogger<GetSitemapXmlHandler>.Instance,
            new FakeTimeProvider(GenerationDay));
    }

    private static string? LastmodOf(string xml, string loc) =>
        XDocument.Parse(xml).Descendants(Ns + "url")
            .Single(u => u.Element(Ns + "loc")!.Value == loc)
            .Element(Ns + "lastmod")?.Value;

    private static PublicProfileRef Showing(string handle, DateTimeOffset updatedAt) =>
        new(handle, updatedAt) { UserId = $"id-{handle}", HasProfileText = true };

    private static PublicProfileRef Bare(string handle, bool isWatchlistPublic = true) =>
        new(handle, GenerationDay) { UserId = $"id-{handle}", IsWatchlistPublic = isWatchlistPublic };

    private void SetupProfiles(params PublicProfileRef[] profiles) =>
        _users.Setup(r => r.ListPublicProfilesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(profiles);

    private static List<string> Locs(string xml) =>
        XDocument.Parse(xml).Descendants(Ns + "loc").Select(e => e.Value).ToList();

    [Fact]
    public async Task BuildXmlAsync_AsManyPublicProfilesAsAsked_StaysWithinTheFiftyThousandUrlLimit()
    {
        _users.Setup(r => r.ListPublicProfilesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int limit, CancellationToken _) => Enumerable.Range(0, limit)
                .Select(i => Showing($"user-{i}", GenerationDay))
                .ToList());

        var xml = await CreateSut().BuildXmlAsync();

        Assert.True(Locs(xml).Count <= 50_000, $"{Locs(xml).Count} URLs");
    }

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
    public async Task BuildXmlAsync_DatesTheDailyListsFromTheClockAndLeavesTheOthersUndated()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Equal("2026-09-18", LastmodOf(xml, "https://web.example/"));
        Assert.Equal("2026-09-18", LastmodOf(xml, "https://web.example/films/tendances"));
        Assert.Null(LastmodOf(xml, "https://web.example/films/au-cinema"));
        Assert.Null(LastmodOf(xml, "https://web.example/films/les-plus-proposes"));
        Assert.Null(LastmodOf(xml, "https://web.example/decouvrir"));
        Assert.Null(LastmodOf(xml, "https://web.example/films/collections"));
        Assert.Null(LastmodOf(xml, "https://web.example/tech"));
    }

    [Fact]
    public async Task BuildXmlAsync_IncludesPublicProfileUrls()
    {
        SetupProfiles(
            Showing("alice", new DateTimeOffset(2026, 7, 10, 0, 0, 0, TimeSpan.Zero)),
            Showing("bob", new DateTimeOffset(2026, 7, 12, 0, 0, 0, TimeSpan.Zero)));
        var xml = await CreateSut().BuildXmlAsync();

        var locs = Locs(xml);
        Assert.Contains("https://web.example/u/alice", locs);
        Assert.Contains("https://web.example/u/bob", locs);
        Assert.Contains("2026-07-10", xml);
    }

    [Fact]
    public async Task BuildXmlAsync_TrimsTrailingSlashOnBase()
    {
        SetupProfiles(Showing("alice", DateTimeOffset.UtcNow));
        var xml = await CreateSut("https://web.example/").BuildXmlAsync();

        Assert.Contains("https://web.example/u/alice", Locs(xml));
        Assert.DoesNotContain("https://web.example//u/alice", xml);
        Assert.DoesNotContain("https://web.example//", xml);
    }

    [Fact]
    public async Task BuildXmlAsync_ProducesWellFormedUrlset()
    {
        SetupProfiles(Showing("alice", DateTimeOffset.UtcNow));
        var xml = await CreateSut().BuildXmlAsync();

        var root = XDocument.Parse(xml).Root;
        Assert.NotNull(root);
        Assert.Equal(Ns + "urlset", root!.Name);
        Assert.Equal(9, root.Elements(Ns + "url").Count());
    }

    [Fact]
    public async Task BuildXmlAsync_LeavesOutTheProfilesThatShowNothing()
    {
        SetupProfiles(Bare("empty"), Bare("night"), Bare("lists"), Bare("watchlist"), Bare("hidden", isWatchlistPublic: false));
        _participants.Setup(r => r.ListByUserIdAsync("id-night", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = "p1", EventId = "e1", UserId = "id-night", Pseudo = "Nuit" }]);
        _lists.Setup(r => r.CountPublicByOwnerAsync("id-lists", It.IsAny<CancellationToken>())).ReturnsAsync(2);
        _watchlist.Setup(r => r.CountByUserIdAsync("id-watchlist", It.IsAny<CancellationToken>())).ReturnsAsync(5);
        _watchlist.Setup(r => r.CountByUserIdAsync("id-hidden", It.IsAny<CancellationToken>())).ReturnsAsync(5);

        var locs = Locs(await CreateSut().BuildXmlAsync());

        Assert.Contains("https://web.example/u/night", locs);
        Assert.Contains("https://web.example/u/lists", locs);
        Assert.Contains("https://web.example/u/watchlist", locs);
        Assert.DoesNotContain("https://web.example/u/empty", locs);
        Assert.DoesNotContain("https://web.example/u/hidden", locs);
    }

    [Fact]
    public async Task BuildXmlAsync_ProfileWithABioOrFavorites_IsListedWithoutAskingFurther()
    {
        SetupProfiles(Showing("alice", GenerationDay));

        var locs = Locs(await CreateSut().BuildXmlAsync());

        Assert.Contains("https://web.example/u/alice", locs);
        _participants.Verify(r => r.ListByUserIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
