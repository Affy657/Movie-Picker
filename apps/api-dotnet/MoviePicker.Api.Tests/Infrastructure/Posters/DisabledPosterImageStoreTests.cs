using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Posters;

public sealed class DisabledPosterImageStoreTests
{
    private readonly DisabledPosterImageStore _sut = new();

    [Theory]
    [InlineData("https://image.tmdb.org/t/p/w500/poster.jpg")]
    [InlineData(null)]
    public void ToPublicPosterPath_ReturnsInputUnchanged(string? posterUrl)
    {
        Assert.Equal(posterUrl, _sut.ToPublicPosterPath(posterUrl));
    }

    [Fact]
    public async Task GetByKeyAsync_ReturnsNull()
    {
        Assert.Null(await _sut.GetByKeyAsync("any-key"));
    }

    [Fact]
    public async Task RegisterTmdbSourceAsync_DoesNotThrow()
    {
        var ex = await Record.ExceptionAsync(() =>
            _sut.RegisterTmdbSourceAsync("https://image.tmdb.org/t/p/original/x.jpg"));

        Assert.Null(ex);
    }

    [Fact]
    public async Task RegisterTmdbSourcesAsync_DoesNotThrow()
    {
        var ex = await Record.ExceptionAsync(() =>
            _sut.RegisterTmdbSourcesAsync(new[] { "https://image.tmdb.org/t/p/original/x.jpg" }));

        Assert.Null(ex);
    }
}
