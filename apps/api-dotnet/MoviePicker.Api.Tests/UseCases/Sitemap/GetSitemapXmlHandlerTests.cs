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

    private readonly Mock<IUserRepository> _users = new();

    private GetSitemapXmlHandler CreateSut(string webBase = "https://web.example")
    {
        var opts = Options.Create(new MoviePickerOptions { PublicWebBaseUrl = webBase });
        return new GetSitemapXmlHandler(_users.Object, opts, NullLogger<GetSitemapXmlHandler>.Instance);
    }

    private void SetupProfiles(params PublicProfileRef[] profiles) =>
        _users.Setup(r => r.ListPublicProfilesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(profiles);

    private static IReadOnlyList<string> Locs(string xml) =>
        XDocument.Parse(xml).Descendants(Ns + "loc").Select(e => e.Value).ToList();

    [Fact]
    public async Task BuildXmlAsync_AlwaysIncludesHomepage()
    {
        SetupProfiles();
        var xml = await CreateSut().BuildXmlAsync();

        Assert.Contains("https://web.example/", Locs(xml));
        Assert.NotNull(XDocument.Parse(xml).Root);
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
    }

    [Fact]
    public async Task BuildXmlAsync_ProducesWellFormedUrlset()
    {
        SetupProfiles(new PublicProfileRef("alice", DateTimeOffset.UtcNow));
        var xml = await CreateSut().BuildXmlAsync();

        var root = XDocument.Parse(xml).Root;
        Assert.NotNull(root);
        Assert.Equal(Ns + "urlset", root!.Name);
        Assert.Equal(2, root.Elements(Ns + "url").Count());
    }
}
