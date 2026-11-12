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
            TrailerUrl: "https://www.youtube.com/watch?v=abc",
            VoteAverage: 8.4,
            PosterUrl: "https://image.tmdb.org/t/p/w154/inception.jpg",
            BackdropUrl: "https://image.tmdb.org/t/p/w780/inception-wide.jpg");
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
        Assert.Equal(8.4, result.VoteAverage);
        Assert.Equal("https://image.tmdb.org/t/p/w154/inception.jpg", result.PosterPath);
        Assert.Equal("https://image.tmdb.org/t/p/w780/inception-wide.jpg", result.BackdropPath);
        Assert.Null(result.SeasonCount);
        Assert.Null(result.EpisodeCount);
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

    private static readonly string[] ProductionCountries = ["GB", "US"];

    private static Mock<ITmdbMovieSearch> TmdbAnswering(TmdbMovieDetailsExtras? extras)
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        tmdb.Setup(t => t.GetDetailsAsync(27205, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(
                27205, "Inception", null, null, "Christopher Nolan", Cast, 148, Genres, GenreIds, "2010-07-16",
                Extras: extras));
        return tmdb;
    }

    [Fact]
    public async Task HandleAsync_TmdbReturnsTheFilmPageFacts_MapsThemNextToTheModalFields()
    {
        var tmdb = TmdbAnswering(new TmdbMovieDetailsExtras(
            OriginalTitle: "Inception",
            OriginalLanguage: "en",
            ProductionCountries: ProductionCountries,
            Budget: 160_000_000,
            VoteCount: 37_112,
            Certification: "12",
            Collection: new TmdbCollectionReference(1_241, "Inception, la saga"),
            DirectorId: 525,
            CastMembers: [new TmdbCastMember("Leonardo DiCaprio", "Cobb", "https://image.tmdb.org/t/p/w185/leo.jpg"), new TmdbCastMember("Elliot Page", null, null)],
            Crew: [new TmdbCrewCredit(TmdbCrewJobs.Director, "Christopher Nolan"), new TmdbCrewCredit(TmdbCrewJobs.Composer, "Hans Zimmer")],
            Videos: [new TmdbVideo("abc", "Bande-annonce VF", "Trailer", "fr"), new TmdbVideo("def", "Clip", "Clip", null)]));

        var result = await Build(tmdb).HandleAsync(27205, MovieMediaType.Movie);

        Assert.NotNull(result);
        Assert.Equal("Christopher Nolan", result!.Director);
        Assert.Equal(Cast, result.Cast);
        Assert.Equal("Inception", result.OriginalTitle);
        Assert.Equal("en", result.OriginalLanguage);
        Assert.Equal(ProductionCountries, result.ProductionCountries);
        Assert.Equal(160_000_000L, result.Budget);
        Assert.Equal(37_112, result.VoteCount);
        Assert.Equal("12", result.Certification);
        Assert.Equal(1_241, result.Collection!.Id);
        Assert.Equal("Inception, la saga", result.Collection.Name);
        Assert.Equal(525, result.DirectorId);
        Assert.Equal(2, result.CastMembers.Count);
        Assert.Equal("Leonardo DiCaprio", result.CastMembers[0].Name);
        Assert.Equal("Cobb", result.CastMembers[0].Character);
        Assert.Equal("https://image.tmdb.org/t/p/w185/leo.jpg", result.CastMembers[0].ProfilePath);
        Assert.Null(result.CastMembers[1].Character);
        Assert.Null(result.CastMembers[1].ProfilePath);
        Assert.Equal(
            [(TmdbCrewJobs.Director, "Christopher Nolan"), (TmdbCrewJobs.Composer, "Hans Zimmer")],
            result.Crew.Select(member => (member.Job, member.Name)));
        Assert.Equal(2, result.Videos.Count);
        Assert.Equal(("abc", "Bande-annonce VF", "Trailer", "fr"), (result.Videos[0].Key, result.Videos[0].Name, result.Videos[0].Type, result.Videos[0].Language));
        Assert.Null(result.Videos[1].Language);
    }

    [Fact]
    public async Task HandleAsync_DetailsWithoutFilmPageFacts_AnswersEmptyListsAndNulls()
    {
        var result = await Build(TmdbAnswering(null)).HandleAsync(27205, MovieMediaType.Movie);

        Assert.NotNull(result);
        Assert.Null(result!.OriginalTitle);
        Assert.Null(result.OriginalLanguage);
        Assert.Empty(result.ProductionCountries);
        Assert.Null(result.Budget);
        Assert.Null(result.VoteCount);
        Assert.Null(result.Certification);
        Assert.Null(result.Collection);
        Assert.Null(result.DirectorId);
        Assert.Empty(result.CastMembers);
        Assert.Empty(result.Crew);
        Assert.Empty(result.Videos);
    }
}
