using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class WinnerRuntimesTests
{
    private static readonly Movie Interstellar = new() { Id = "m1", TmdbId = 157336, MediaType = MovieMediaType.Movie, Title = "Interstellar" };

    private readonly Mock<ITmdbMovieSearch> _tmdb = new();

    private TmdbWinnerRuntimes Runtimes(string? apiKey = "key") => new(
        _tmdb.Object,
        Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey }),
        NullLogger<TmdbWinnerRuntimes>.Instance);

    private void GivenEnrichment(int? runtimeMinutes) =>
        _tmdb.Setup(t => t.GetEnrichmentsAsync(
                It.Is<IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)>>(keys => keys.Single().TmdbId == 157336),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(157336, MovieMediaType.Movie)] = new(null, [], null, runtimeMinutes)
            });

    [Fact]
    public async Task LookUpAsync_ReadsTheRuntimeOfTheFilmFromItsEnrichment()
    {
        GivenEnrichment(169);

        Assert.Equal(169, await Runtimes().LookUpAsync(Interstellar, CancellationToken.None));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    public async Task LookUpAsync_UnknownRuntime_LeavesItUnknown(int? runtimeMinutes)
    {
        GivenEnrichment(runtimeMinutes);

        Assert.Null(await Runtimes().LookUpAsync(Interstellar, CancellationToken.None));
    }

    [Fact]
    public async Task LookUpAsync_TmdbDown_LeavesTheRuntimeUnknownInsteadOfFailingTheDraw()
    {
        _tmdb.Setup(t => t.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB down"));

        Assert.Null(await Runtimes().LookUpAsync(Interstellar, CancellationToken.None));
    }

    [Fact]
    public async Task LookUpAsync_NoTmdbCredentials_DoesNotCallTmdb()
    {
        Assert.Null(await Runtimes(apiKey: null).LookUpAsync(Interstellar, CancellationToken.None));

        _tmdb.VerifyNoOtherCalls();
    }
}
