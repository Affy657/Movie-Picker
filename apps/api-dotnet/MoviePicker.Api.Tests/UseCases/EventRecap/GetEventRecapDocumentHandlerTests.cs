using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventRecap;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventRecap;

public sealed class GetEventRecapDocumentHandlerTests
{
    private const string Shell =
        "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"UTF-8\" />\n"
        + "<meta\n  name=\"description\"\n  content=\"Description du site\"\n/>\n"
        + "<meta property=\"og:site_name\" content=\"Movie Picker\" />\n"
        + "<meta property=\"og:title\" content=\"Titre du site\" />\n"
        + "<meta\n  property=\"og:description\"\n  content=\"Description OG du site\"\n/>\n"
        + "<meta property=\"og:image\" content=\"https://web.example/og-image.png\" />\n"
        + "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n"
        + "<meta name=\"twitter:title\" content=\"Titre du site\" />\n"
        + "<link rel=\"canonical\" href=\"https://web.example/\" />\n"
        + "<title>Titre du site</title>\n"
        + "<script type=\"application/ld+json\">{\"@type\":\"WebSite\"}</script>\n"
        + "<link rel=\"stylesheet\" href=\"/assets/index.css\" />\n"
        + "</head>\n<body>\n<div id=\"root\"></div>\n<script type=\"module\" src=\"/assets/index.js\"></script>\n</body>\n</html>\n";

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IMovieRatingRepository> _ratings = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly Mock<IWebShellSource> _shell = new();

    public GetEventRecapDocumentHandlerTests()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Shell);
        _participants.Setup(r => r.CountByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(4);
        _ratings.Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? url) => url is null ? null : "/api/v1/posters/abc");
    }

    private GetEventRecapDocumentHandler CreateSut() =>
        new(
            _events.Object,
            _movies.Object,
            _participants.Object,
            _ratings.Object,
            _posters.Object,
            _shell.Object,
            Options.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://web.example/" }));

    private static Event Night(string slug, string title, params string[] winnerMovieIds) => new()
    {
        Id = "evt-" + slug,
        Title = title,
        Slug = slug,
        HostToken = "h",
        Date = "2026-09-18",
        Time = "20:30",
        Winners = winnerMovieIds
            .Select(movieId => new EventWinner
            {
                MovieId = movieId,
                Method = WinnerPickMethod.Wheel,
                PickedAt = new DateTimeOffset(2026, 9, 18, 19, 0, 0, TimeSpan.Zero)
            })
            .ToList(),
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void GivenNight(Event evt) =>
        _events.Setup(r => r.GetByIdOrSlugAsync(evt.Slug, It.IsAny<CancellationToken>())).ReturnsAsync(evt);

    private void GivenWinner(Event evt, string movieId, string title, string year, string? poster = "https://image.tmdb.org/t/p/w500/heat.jpg") =>
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Movie { Id = movieId, EventId = evt.Id, Title = title, Year = year, PosterPath = poster }]);

    private void GivenRatings(Event evt, string movieId, params int[] values) =>
        _ratings.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(values
                .Select((value, index) => new MovieRating { EventId = evt.Id, MovieId = movieId, ParticipantId = "p" + index, Value = value })
                .ToList());

    private static string Meta(string html, string key)
    {
        var match = Regex.Match(html, $"<meta (?:property|name)=\"{Regex.Escape(key)}\" content=\"([^\"]*)\"");
        Assert.True(match.Success, $"missing meta {key}");
        return WebUtility.HtmlDecode(match.Groups[1].Value);
    }

    [Fact]
    public async Task HandleAsync_NightWithRatedWinner_InjectsTheNightIntoTheShell()
    {
        var evt = Night("7fKq2p", "Soirée du vendredi", "m1");
        GivenNight(evt);
        GivenWinner(evt, "m1", "Heat", "1995");
        GivenRatings(evt, "m1", 9, 10, 7);

        var document = await CreateSut().HandleAsync("7fKq2p", "https://api.example/", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Soirée du vendredi, le recap", Meta(document.Html, "og:title"));
        Assert.Equal(
            "On a vu Heat (1995), noté 4,3/5 par 3 participants, le vendredi 18 septembre 2026.",
            Meta(document.Html, "og:description"));
        Assert.Equal("https://api.example/api/v1/posters/abc", Meta(document.Html, "og:image"));
        Assert.Equal("Affiche de Heat", Meta(document.Html, "og:image:alt"));
        Assert.Equal("https://web.example/r/7fKq2p", Meta(document.Html, "og:url"));
        Assert.Equal("Movie Picker", Meta(document.Html, "og:site_name"));
        Assert.Equal("noindex, nofollow", Meta(document.Html, "robots"));
        Assert.Equal("Soirée du vendredi, le recap", Meta(document.Html, "twitter:title"));
        Assert.Contains("<title>Soirée du vendredi, le recap | Movie Picker</title>", document.Html);
        Assert.Contains("<link rel=\"canonical\" href=\"https://web.example/r/7fKq2p\" />", document.Html);
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.Contains("<link rel=\"stylesheet\" href=\"/assets/index.css\" />", document.Html);
        Assert.Contains("<meta charset=\"UTF-8\" />", document.Html);
        Assert.DoesNotContain("Titre du site", document.Html);
        Assert.DoesNotContain("Description du site", document.Html);
        Assert.DoesNotContain("Description OG du site", document.Html);
        Assert.DoesNotContain("ld+json", document.Html);
        Assert.Single(Regex.Matches(document.Html, "property=\"og:title\""));
        Assert.Single(Regex.Matches(document.Html, "<title>"));
        Assert.Single(Regex.Matches(document.Html, "rel=\"canonical\""));
    }

    [Fact]
    public async Task HandleAsync_WinnerWithoutRating_DescribesTheNightWithoutAnAverage()
    {
        var evt = Night("abc", "Soirée du vendredi", "m1");
        GivenNight(evt);
        GivenWinner(evt, "m1", "Heat", "1995");
        _participants.Setup(r => r.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var document = await CreateSut().HandleAsync("abc", "https://api.example", default);

        Assert.Equal(
            "On a vu Heat (1995) le vendredi 18 septembre 2026, avec 1 participant.",
            Meta(document.Html, "og:description"));
    }

    [Fact]
    public async Task HandleAsync_WinnerWithoutPoster_FallsBackToTheSiteImage()
    {
        var evt = Night("abc", "Soirée", "m1");
        GivenNight(evt);
        GivenWinner(evt, "m1", "Heat", "1995", poster: null);

        var document = await CreateSut().HandleAsync("abc", "https://api.example", default);

        Assert.Equal("https://web.example/og-image.png", Meta(document.Html, "og:image"));
    }

    [Fact]
    public async Task HandleAsync_NightWithoutWinner_KeepsTheTitleAndAGenericPreview()
    {
        var evt = Night("Q2mZ8x", "Nuit Nolan");
        GivenNight(evt);

        var document = await CreateSut().HandleAsync("Q2mZ8x", "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Nuit Nolan, le recap", Meta(document.Html, "og:title"));
        Assert.Equal(
            "Le film n'est pas encore choisi. Soirée ciné organisée sur Movie Picker.",
            Meta(document.Html, "og:description"));
        Assert.Equal("https://web.example/og-image.png", Meta(document.Html, "og:image"));
        Assert.Equal("Movie Picker", Meta(document.Html, "og:image:alt"));
        _movies.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
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
    public async Task HandleAsync_ShellUnavailable_AnswersAMinimalDocumentThatSendsToTheNight()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync((string?)null);
        var evt = Night("7fKq2p", "Soirée du vendredi", "m1");
        GivenNight(evt);
        GivenWinner(evt, "m1", "Heat", "1995");

        var document = await CreateSut().HandleAsync("7fKq2p", "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Soirée du vendredi, le recap", Meta(document.Html, "og:title"));
        Assert.Contains("<meta http-equiv=\"refresh\" content=\"0; url=https://web.example/e/7fKq2p\" />", document.Html);
        Assert.Contains("<a href=\"https://web.example/e/7fKq2p\">", document.Html);
        Assert.DoesNotContain("id=\"root\"", document.Html);
    }

    [Fact]
    public async Task HandleAsync_ShellUnavailableAndUnknownSlug_SendsHome()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync((string?)null);
        _events.Setup(r => r.GetByIdOrSlugAsync("nope", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var document = await CreateSut().HandleAsync("nope", "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Contains("<meta http-equiv=\"refresh\" content=\"0; url=https://web.example/\" />", document.Html);
    }

    [Fact]
    public async Task HandleAsync_EscapesTheTitleInAttributes()
    {
        var evt = Night("s2", "<script>alert(1)</script>");
        GivenNight(evt);

        var document = await CreateSut().HandleAsync("s2", "https://api.example", default);

        Assert.Contains("content=\"&lt;script&gt;alert(1)&lt;/script&gt;, le recap\"", document.Html);
        Assert.DoesNotContain("<script>alert(1)</script>", document.Html);
    }

    [Fact]
    public async Task HandleAsync_ShellWithoutTitle_InsertsTheTagsBeforeTheHeadCloses()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync("<html><head><meta charset=\"UTF-8\" /></head><body><div id=\"root\"></div></body></html>");
        var evt = Night("abc", "Soirée");
        GivenNight(evt);

        var document = await CreateSut().HandleAsync("abc", "https://api.example", default);

        Assert.Contains("<title>Soirée, le recap | Movie Picker</title>", document.Html);
        Assert.Contains("</title>", document.Html[..document.Html.IndexOf("</head>", StringComparison.Ordinal)]);
        Assert.Contains("<div id=\"root\"></div>", document.Html);
    }
}
