using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieDetails;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieDetails;

public sealed class GetMovieDetailsHandlerTests
{
    private static GetMovieDetailsHandler Build(Mock<ITmdbMovieSearch> tmdb) =>
        new(tmdb.Object, Options.Create(new MoviePickerOptions()));

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task HandleAsync_InvalidId_ReturnsNull(int tmdbId)
    {
        var tmdb = new Mock<ITmdbMovieSearch>(MockBehavior.Strict);

        var result = await Build(tmdb).HandleAsync(tmdbId, MovieMediaType.Movie);

        Assert.Null(result);
        tmdb.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_TmdbReturnsNull_ReturnsNull()
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        tmdb.Setup(t => t.GetDetailsAsync(42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);

        var result = await Build(tmdb).HandleAsync(42, MovieMediaType.Movie);

        Assert.Null(result);
    }

    private static readonly string[] Cast = new[] { "Leonardo DiCaprio", "Joseph Gordon-Levitt" };
    private static readonly string[] Genres = new[] { "Action", "Science-fiction" };
    private static readonly int[] GenreIds = new[] { 28, 878 };

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
            Cast: Cast,
            Runtime: 148,
            Genres: Genres,
            GenreIds: GenreIds,
            ReleaseDate: "2010-07-16",
            TrailerUrl: "https://www.youtube.com/watch?v=abc");
        tmdb.Setup(t => t.GetDetailsAsync(27205, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);
        var enrichment = new TmdbMovieEnrichment(
            VoteAverage: 8.4,
            WatchProviders: new[] { new TmdbWatchProviderOffer(8, "Netflix", "/netflix.png", "flatrate") },
            TmdbWatchPageUrl: "https://www.themoviedb.org/movie/27205/watch",
            RuntimeMinutes: 148);
        tmdb.Setup(t => t.GetEnrichmentAsync(27205, MovieMediaType.Movie, "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(enrichment);

        var result = await Build(tmdb).HandleAsync(27205, MovieMediaType.Movie);

        Assert.NotNull(result);
        Assert.Equal(27205, result!.TmdbId);
        Assert.Equal("Inception", result.Title);
        Assert.Equal("Un voleur qui explore les rêves.", result.Overview);
        Assert.Equal("Votre esprit est la scène du crime.", result.Tagline);
        Assert.Equal("Christopher Nolan", result.Director);
        Assert.Equal(Cast, result.Cast);
        Assert.Equal(148, result.RuntimeMinutes);
        Assert.Equal(Genres, result.Genres);
        Assert.Equal("2010-07-16", result.ReleaseDate);
        Assert.Equal("https://www.youtube.com/watch?v=abc", result.TrailerUrl);
        Assert.Single(result.WatchProviders);
        Assert.Equal("Netflix", result.WatchProviders[0].Name);
        Assert.Equal("https://www.themoviedb.org/movie/27205/watch", result.TmdbWatchPageUrl);
    }

    [Fact]
    public async Task HandleAsync_TmdbHttpError_ThrowsServiceUnavailable()
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        tmdb.Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build(tmdb).HandleAsync(42, MovieMediaType.Movie));
    }
}
