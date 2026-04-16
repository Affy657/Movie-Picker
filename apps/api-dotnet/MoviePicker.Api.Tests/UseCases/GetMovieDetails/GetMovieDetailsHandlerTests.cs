using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieDetails;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieDetails;

public sealed class GetMovieDetailsHandlerTests
{
    private static GetMovieDetailsHandler Build(Mock<ITmdbMovieSearch> tmdb) => new(tmdb.Object);

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task HandleAsync_InvalidId_ReturnsNull(int tmdbId)
    {
        var tmdb = new Mock<ITmdbMovieSearch>(MockBehavior.Strict);

        var result = await Build(tmdb).HandleAsync(tmdbId);

        Assert.Null(result);
        tmdb.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_TmdbReturnsNull_ReturnsNull()
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        tmdb.Setup(t => t.GetDetailsAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);

        var result = await Build(tmdb).HandleAsync(42);

        Assert.Null(result);
    }

    [Fact]
    public async Task HandleAsync_TmdbReturnsDetails_MapsAllFields()
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        var details = new TmdbMovieDetails(
            Id: 27205,
            Title: "Inception",
            Overview: "Un voleur qui explore les rêves.",
            Tagline: "Votre esprit est la scène du crime.",
            Director: "Christopher Nolan",
            Cast: new[] { "Leonardo DiCaprio", "Joseph Gordon-Levitt" },
            Runtime: 148,
            Genres: new[] { "Action", "Science-fiction" },
            ReleaseDate: "2010-07-16");
        tmdb.Setup(t => t.GetDetailsAsync(27205, It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);

        var result = await Build(tmdb).HandleAsync(27205);

        Assert.NotNull(result);
        Assert.Equal(27205, result!.TmdbId);
        Assert.Equal("Inception", result.Title);
        Assert.Equal("Un voleur qui explore les rêves.", result.Overview);
        Assert.Equal("Votre esprit est la scène du crime.", result.Tagline);
        Assert.Equal("Christopher Nolan", result.Director);
        Assert.Equal(new[] { "Leonardo DiCaprio", "Joseph Gordon-Levitt" }, result.Cast);
        Assert.Equal(148, result.RuntimeMinutes);
        Assert.Equal(new[] { "Action", "Science-fiction" }, result.Genres);
        Assert.Equal("2010-07-16", result.ReleaseDate);
    }

    [Fact]
    public async Task HandleAsync_TmdbHttpError_ThrowsServiceUnavailable()
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        tmdb.Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build(tmdb).HandleAsync(42));
    }
}
