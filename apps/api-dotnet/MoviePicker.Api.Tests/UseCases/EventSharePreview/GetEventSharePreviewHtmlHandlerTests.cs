using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventSharePreview;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventSharePreview;

public sealed class GetEventSharePreviewHtmlHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IPosterImageStore> _posters = new();

    private GetEventSharePreviewHtmlHandler CreateSut(string webBase = "https://web.example")
    {
        var opts = Options.Create(new MoviePickerOptions { PublicWebBaseUrl = webBase });
        return new GetEventSharePreviewHtmlHandler(_events.Object, _movies.Object, _posters.Object, opts);
    }

    [Fact]
    public async Task BuildHtmlAsync_Unknown_ThrowsNotFound()
    {
        _events.Setup(r => r.GetByIdOrSlugAsync("x", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var sut = CreateSut();
        await Assert.ThrowsAsync<NotFoundException>(() => sut.BuildHtmlAsync("x", "https://api.example", default));
    }

    [Fact]
    public async Task BuildHtmlAsync_Minimal_DoesNotIncludeEventTitleInMeta()
    {
        var evt = new Event
        {
            Id = "1",
            Title = "Titre secret",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "slug1",
            HostToken = "h",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _events.Setup(r => r.GetByIdOrSlugAsync("slug1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var sut = CreateSut("https://web.example");
        var html = await sut.BuildHtmlAsync("slug1", "https://api.example", default);

        Assert.Contains("property=\"og:title\" content=\"Movie Picker", html);
        Assert.DoesNotContain("Titre secret", html);
        Assert.Contains("https://web.example/e/slug1", html);
        Assert.Contains("name=\"robots\" content=\"noindex, follow\"", html);
    }

    [Fact]
    public async Task BuildHtmlAsync_Rich_EscapesTitleInAttributes()
    {
        var evt = new Event
        {
            Id = "1",
            Title = "<script>alert(1)</script>",
            Date = "2030-02-02",
            Time = "21:00",
            Slug = "s2",
            HostToken = "h",
            Config = new EventConfig { RichSharePreview = true },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _events.Setup(r => r.GetByIdOrSlugAsync("s2", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movies.Setup(m => m.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Movie?)null);
        var sut = CreateSut();
        var html = await sut.BuildHtmlAsync("s2", "https://api.example", default);

        Assert.Contains("property=\"og:title\" content=\"&lt;script&gt;alert(1)&lt;/script&gt;", html);
        Assert.Contains("Movie Picker", html);
    }
}
