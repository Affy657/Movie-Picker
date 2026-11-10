using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventInvitation;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventInvitation;

public sealed class GetEventInvitationDocumentHandlerTests
{
    private const string Slug = "Ab3dE_9xYz";

    private const string Shell =
        "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"UTF-8\" />\n"
        + "<meta property=\"og:title\" content=\"Titre du site\" />\n"
        + "<link rel=\"canonical\" href=\"https://web.example/\" />\n"
        + "<title>Titre du site</title>\n"
        + "</head>\n<body>\n<div id=\"root\"></div>\n<script type=\"module\" src=\"/assets/index.js\"></script>\n</body>\n</html>\n";

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly Mock<IWebShellSource> _shell = new();

    public GetEventInvitationDocumentHandlerTests()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Shell);
        _posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? url) => url is null ? null : "/api/v1/posters/abc");
    }

    private GetEventInvitationDocumentHandler CreateSut() =>
        new(
            _events.Object,
            _movies.Object,
            _posters.Object,
            _shell.Object,
            Options.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://web.example/" }));

    private Event GivenNight(string title, EventConfig? config, string time = "20:30", string? winnerMovieId = null)
    {
        var evt = new Event
        {
            Id = "evt-1",
            Title = title,
            Slug = Slug,
            RecapSlug = "7fKq2p",
            HostToken = "h",
            Date = "2026-09-18",
            Time = time,
            Config = config,
            Winners = winnerMovieId is null
                ? []
                : [new EventWinner { MovieId = winnerMovieId, Method = WinnerPickMethod.Wheel, PickedAt = DateTimeOffset.UtcNow }],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _events.Setup(r => r.GetByIdOrSlugAsync(Slug, It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        return evt;
    }

    private static string Meta(string html, string key)
    {
        var match = Regex.Match(html, $"<meta (?:property|name)=\"{Regex.Escape(key)}\" content=\"([^\"]*)\"");
        Assert.True(match.Success, $"missing meta {key}");
        return WebUtility.HtmlDecode(match.Groups[1].Value);
    }

    [Fact]
    public async Task HandleAsync_RichNight_InjectsItsTitleDateAndThemeIntoTheShell()
    {
        GivenNight("Soirée du vendredi", new EventConfig { RichSharePreview = true, Theme = "Nolan" });

        var document = await CreateSut().HandleAsync(Slug, "https://api.example/", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Soirée du vendredi", Meta(document.Html, "og:title"));
        Assert.Equal(
            "Soirée ciné le vendredi 18 septembre 2026 à 20h30. Thème : Nolan. Rejoins la soirée et vote pour ton film.",
            Meta(document.Html, "og:description"));
        Assert.Equal("https://web.example/og-image.png", Meta(document.Html, "og:image"));
        Assert.Equal($"https://web.example/e/{Slug}", Meta(document.Html, "og:url"));
        Assert.Contains("<title>Soirée du vendredi | Movie Picker</title>", document.Html);
        Assert.Contains($"<link rel=\"canonical\" href=\"https://web.example/e/{Slug}\" />", document.Html);
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.DoesNotContain("Titre du site", document.Html);
        _movies.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NightSavedWithoutSettings_GetsTheRichPreviewOnTheHour()
    {
        GivenNight("Nuit Nolan", config: null, time: "20:00");

        var document = await CreateSut().HandleAsync(Slug, "https://api.example", default);

        Assert.Equal("Nuit Nolan", Meta(document.Html, "og:title"));
        Assert.Equal(
            "Soirée ciné le vendredi 18 septembre 2026 à 20h. Rejoins la soirée et vote pour ton film.",
            Meta(document.Html, "og:description"));
    }

    [Fact]
    public async Task HandleAsync_RichPreviewTurnedOff_SharesNothingOfTheNight()
    {
        GivenNight("Soirée confidentielle", new EventConfig { RichSharePreview = false, Theme = "Nolan" }, winnerMovieId: "m1");

        var document = await CreateSut().HandleAsync(Slug, "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Invitation à une soirée ciné", Meta(document.Html, "og:title"));
        Assert.Equal(
            "Tu as reçu une invitation pour une soirée ciné sur Movie Picker. Ouvre le lien pour la rejoindre.",
            Meta(document.Html, "og:description"));
        Assert.Equal("https://web.example/og-image.png", Meta(document.Html, "og:image"));
        Assert.Equal($"https://web.example/e/{Slug}", Meta(document.Html, "og:url"));
        Assert.DoesNotContain("confidentielle", document.Html);
        Assert.DoesNotContain("septembre", document.Html);
        Assert.DoesNotContain("Nolan", document.Html);
        _movies.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NightWithAWinner_AnnouncesTheFilmWithItsPoster()
    {
        var evt = GivenNight("Soirée du vendredi", new EventConfig { RichSharePreview = true }, winnerMovieId: "m1");
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Movie { Id = "m1", EventId = evt.Id, Title = "Heat", Year = "1995", PosterPath = "https://image.tmdb.org/t/p/w500/heat.jpg" }]);

        var document = await CreateSut().HandleAsync(Slug, "https://api.example/", default);

        Assert.Equal(
            "Au programme : Heat (1995) le vendredi 18 septembre 2026 à 20h30.",
            Meta(document.Html, "og:description"));
        Assert.Equal("https://api.example/api/v1/posters/abc", Meta(document.Html, "og:image"));
        Assert.Equal("Affiche de Heat", Meta(document.Html, "og:image:alt"));
    }

    [Fact]
    public async Task HandleAsync_UnknownSlug_Returns404WithTheGenericShellTags()
    {
        _events.Setup(r => r.GetByIdOrSlugAsync("nope", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var document = await CreateSut().HandleAsync("nope", "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Equal("Movie Picker", Meta(document.Html, "og:title"));
        Assert.Equal("https://web.example/", Meta(document.Html, "og:url"));
        Assert.Equal("noindex, nofollow", Meta(document.Html, "robots"));
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.DoesNotContain("nope", document.Html);
    }

    [Fact]
    public async Task HandleAsync_ShellUnavailable_KeepsTheInvitationThroughTheSignInPage()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync((string?)null);
        GivenNight("Soirée du vendredi", config: null);

        var document = await CreateSut().HandleAsync(Slug, "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Soirée du vendredi", Meta(document.Html, "og:title"));
        Assert.Contains($"<meta http-equiv=\"refresh\" content=\"0; url=https://web.example/login?returnTo=%2Fe%2F{Slug}\" />", document.Html);
        Assert.DoesNotContain("id=\"root\"", document.Html);
    }

    [Fact]
    public async Task HandleAsync_EscapesTheTitleAndTheThemeInAttributes()
    {
        GivenNight("<script>alert(1)</script>", new EventConfig { RichSharePreview = true, Theme = "\"><img src=x>" });

        var document = await CreateSut().HandleAsync(Slug, "https://api.example", default);

        Assert.Contains("content=\"&lt;script&gt;alert(1)&lt;/script&gt;\"", document.Html);
        Assert.DoesNotContain("<script>alert(1)</script>", document.Html);
        Assert.DoesNotContain("<img src=x>", document.Html);
    }
}
