using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Posters;

public sealed class MemoryPosterImageStoreTests
{
    private static MemoryPosterImageStore Build() => new(
        new Mock<IHttpClientFactory>().Object,
        Options.Create(new MoviePickerOptions()),
        NullLogger<MemoryPosterImageStore>.Instance);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ToPublicPosterPath_BlankInput_ReturnedAsIs(string? input)
    {
        Assert.Equal(input, Build().ToPublicPosterPath(input));
    }

    [Fact]
    public void ToPublicPosterPath_TmdbUrl_MappedToApiPath()
    {
        const string tmdbUrl = "https://image.tmdb.org/t/p/w500/abc.jpg";
        var expectedKey = TmdbPosterUrlNormalizer.ComputeKey(tmdbUrl);

        var result = Build().ToPublicPosterPath(tmdbUrl);

        Assert.Equal(TmdbPosterUrlNormalizer.ApiPosterPathPrefix + expectedKey, result);
    }

    [Fact]
    public void ToPublicPosterPath_AlreadyApiPath_ReturnedNormalized()
    {
        var key = TmdbPosterUrlNormalizer.ComputeKey("https://image.tmdb.org/t/p/w500/x.jpg");
        var apiPath = TmdbPosterUrlNormalizer.ApiPosterPathPrefix + key;

        Assert.Equal(apiPath, Build().ToPublicPosterPath(apiPath));
    }

    [Fact]
    public void ToPublicPosterPath_NonTmdbUrl_ReturnedUnchanged()
    {
        const string foreign = "https://example.com/poster.jpg";

        Assert.Equal(foreign, Build().ToPublicPosterPath(foreign));
    }

    [Fact]
    public async Task RegisterTmdbSourcesAsync_Empty_DoesNotThrow()
    {
        var exception = await Record.ExceptionAsync(() => Build().RegisterTmdbSourcesAsync([]));

        Assert.Null(exception);
    }

    [Fact]
    public async Task GetByKeyAsync_InvalidKey_ReturnsNull()
    {
        Assert.Null(await Build().GetByKeyAsync("not-a-valid-key"));
    }

    [Fact]
    public async Task GetByKeyAsync_UnknownValidKey_ReturnsNull()
    {
        var validButUnknown = TmdbPosterUrlNormalizer.ComputeKey("https://image.tmdb.org/t/p/w500/never-registered.jpg");

        Assert.Null(await Build().GetByKeyAsync(validButUnknown));
    }
}
