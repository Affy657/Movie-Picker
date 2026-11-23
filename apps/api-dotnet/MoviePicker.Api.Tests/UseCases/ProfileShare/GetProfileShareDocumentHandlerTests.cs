using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ProfileShare;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ProfileShare;

public sealed class GetProfileShareDocumentHandlerTests
{
    private const string Shell =
        "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"UTF-8\" />\n"
        + "<meta property=\"og:title\" content=\"Titre du site\" />\n"
        + "<meta property=\"og:url\" content=\"https://web.example/\" />\n"
        + "<link rel=\"canonical\" href=\"https://web.example/\" />\n"
        + "<title>Titre du site</title>\n"
        + "</head>\n<body>\n<div id=\"root\"></div>\n<script type=\"module\" src=\"/assets/index.js\"></script>\n</body>\n</html>\n";

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IWebShellSource> _shell = new();

    public GetProfileShareDocumentHandlerTests() =>
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Shell);

    private GetProfileShareDocumentHandler CreateSut() =>
        new(
            _users.Object,
            _shell.Object,
            Options.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://web.example/" }));

    private User GivenMember(
        string handle = "lea",
        string displayName = "Léa Moreau",
        string? bio = null,
        bool isPublic = true,
        ProfileBanner? banner = null,
        BannerPhoto? bannerPhoto = null)
    {
        var user = new User
        {
            Id = "u1",
            Email = "lea@example.com",
            Handle = handle,
            DisplayName = displayName,
            Bio = bio,
            IsProfilePublic = isPublic,
            Banner = banner,
            BannerPhoto = bannerPhoto,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _users.Setup(r => r.GetByHandleAsync(handle, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        return user;
    }

    private static string Meta(string html, string key)
    {
        var match = Regex.Match(html, $"<meta (?:property|name)=\"{Regex.Escape(key)}\" content=\"([^\"]*)\"");
        Assert.True(match.Success, $"missing meta {key}");
        return WebUtility.HtmlDecode(match.Groups[1].Value);
    }

    [Fact]
    public async Task HandleAsync_PublicProfile_InjectsTheMemberIntoTheShell()
    {
        GivenMember();

        var document = await CreateSut().HandleAsync("lea", "https://api.example/", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Léa Moreau (@lea)", Meta(document.Html, "og:title"));
        Assert.Equal(
            "Profil de Léa Moreau (@lea) sur Movie Picker : statistiques de soirées ciné, films proposés et abonnements.",
            Meta(document.Html, "og:description"));
        Assert.Equal("https://web.example/u/lea", Meta(document.Html, "og:url"));
        Assert.Equal("profile", Meta(document.Html, "og:type"));
        Assert.Equal("https://web.example/og-image.png", Meta(document.Html, "og:image"));
        Assert.Contains("<link rel=\"canonical\" href=\"https://web.example/u/lea\" />", document.Html);
        Assert.Contains("<title>Léa Moreau (@lea) | Movie Picker</title>", document.Html);
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.DoesNotContain("Titre du site", document.Html);
        Assert.DoesNotContain("content=\"https://web.example/\"", document.Html);
    }

    [Fact]
    public async Task HandleAsync_PublicProfile_StaysIndexable()
    {
        GivenMember();

        var document = await CreateSut().HandleAsync("lea", "https://api.example", default);

        Assert.DoesNotContain("name=\"robots\"", document.Html);
    }

    [Fact]
    public async Task HandleAsync_HandleInAnotherCase_PointsAtTheCanonicalHandle()
    {
        GivenMember();

        var document = await CreateSut().HandleAsync("LEA", "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("https://web.example/u/lea", Meta(document.Html, "og:url"));
    }

    [Fact]
    public async Task HandleAsync_NameStartingWithAVowel_ElidesTheDescription()
    {
        GivenMember(handle: "ad0", displayName: "AD");

        var document = await CreateSut().HandleAsync("ad0", "https://api.example", default);

        Assert.StartsWith("Profil d’AD (@ad0)", Meta(document.Html, "og:description"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task HandleAsync_MemberWithABio_IsDescribedByIt()
    {
        GivenMember(bio: "  Fan de Nolan et de films coréens.  ");

        var document = await CreateSut().HandleAsync("lea", "https://api.example", default);

        Assert.Equal("Fan de Nolan et de films coréens.", Meta(document.Html, "og:description"));
    }

    [Fact]
    public async Task HandleAsync_FilmBanner_IsThePreviewImage()
    {
        GivenMember(banner: new ProfileBanner { Source = ProfileBannerSource.Film, TmdbId = 27_205, ImagePath = "/wide.jpg", Title = "Inception" });

        var document = await CreateSut().HandleAsync("lea", "https://api.example", default);

        Assert.Equal("https://image.tmdb.org/t/p/w1280/wide.jpg", Meta(document.Html, "og:image"));
        Assert.Equal("summary_large_image", Meta(document.Html, "twitter:card"));
    }

    [Fact]
    public async Task HandleAsync_PhotoBanner_IsServedByTheApi()
    {
        GivenMember(
            banner: new ProfileBanner { Source = ProfileBannerSource.Photo },
            bannerPhoto: new BannerPhoto { Key = "k1" });

        var document = await CreateSut().HandleAsync("lea", "https://api.example/", default);

        Assert.Equal("https://api.example/api/v1/banners/k1", Meta(document.Html, "og:image"));
    }

    [Fact]
    public async Task HandleAsync_PrivateProfile_Returns404WithTheGenericPreview()
    {
        GivenMember(isPublic: false, bio: "Secret");

        var document = await CreateSut().HandleAsync("lea", "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Equal("Movie Picker", Meta(document.Html, "og:title"));
        Assert.Equal("noindex, nofollow", Meta(document.Html, "robots"));
        Assert.DoesNotContain("Léa", document.Html);
        Assert.DoesNotContain("Secret", document.Html);
    }

    [Fact]
    public async Task HandleAsync_UnknownHandle_Returns404WithTheShell()
    {
        var document = await CreateSut().HandleAsync("nobody", "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.DoesNotContain("nobody", document.Html);
    }

    [Fact]
    public async Task HandleAsync_EscapesTheNameAndTheBio()
    {
        GivenMember(displayName: "<script>alert(1)</script>", bio: "\"><img src=x>");

        var document = await CreateSut().HandleAsync("lea", "https://api.example", default);

        Assert.DoesNotContain("<script>alert(1)</script>", document.Html);
        Assert.DoesNotContain("<img src=x>", document.Html);
    }
}
