using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class StubTmdbMovieSearchTests
{
    private readonly StubTmdbMovieSearch _sut = new();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SearchAsync_BlankQuery_ReturnsEmpty(string query)
    {
        var result = await _sut.SearchAsync(query, allowSeries: true);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_WithQuery_ReturnsStubItems()
    {
        var result = await _sut.SearchAsync("inception", allowSeries: false);

        Assert.Equal(2, result.Count);
        Assert.Equal(999_001, result[0].Id);
        Assert.Equal("Film E2E Stub", result[0].Title);
        Assert.Equal(MovieMediaType.Movie, result[0].MediaType);
    }

    [Fact]
    public async Task GetEnrichmentAsync_ReturnsStubEnrichment()
    {
        var enrichment = await _sut.GetEnrichmentAsync(999_001, MovieMediaType.Movie, "FR");

        Assert.NotNull(enrichment);
        Assert.Equal(8.0, enrichment!.VoteAverage);
        Assert.Equal(120, enrichment.RuntimeMinutes);
        Assert.Equal("Netflix Stub", enrichment.WatchProviders.Single().ProviderName);
    }

    [Fact]
    public async Task GetDetailsAsync_ReturnsStubDetails()
    {
        var details = await _sut.GetDetailsAsync(42, MovieMediaType.Movie);

        Assert.NotNull(details);
        Assert.Equal(42, details!.Id);
        Assert.Equal("Réalisateur Stub", details.Director);
        Assert.Equal(2, details.Cast.Count);
        Assert.Equal([878, 18], details.GenreIds);
        Assert.Equal(7.3, details.VoteAverage);
        Assert.Null(details.SeasonCount);
    }

    [Fact]
    public async Task GetDetailsAsync_Tv_ReturnsSeasonAndEpisodeCounts()
    {
        var details = await _sut.GetDetailsAsync(42, MovieMediaType.Tv);

        Assert.Equal(2, details!.SeasonCount);
        Assert.Equal(16, details.EpisodeCount);
    }

    [Fact]
    public async Task GetDetailsAsync_Film_DescribesTheFilmPageFacts()
    {
        var extras = (await _sut.GetDetailsAsync(42, MovieMediaType.Movie))!.Extras;

        Assert.NotNull(extras);
        Assert.Equal("en", extras!.OriginalLanguage);
        Assert.NotEmpty(extras.ProductionCountries);
        Assert.NotNull(extras.Budget);
        Assert.NotNull(extras.Certification);
        Assert.NotNull(extras.DirectorId);
        Assert.Contains(extras.Crew, member => member.Job == TmdbCrewJobs.Director && member.Name == "Réalisateur Stub");
        Assert.Equal(["Actrice Stub", "Acteur Stub"], extras.CastMembers.Select(member => member.Name));
    }

    [Fact]
    public async Task GetDetailsAsync_Film_BelongsToASagaTheShowcaseKnows()
    {
        var extras = (await _sut.GetDetailsAsync(42, MovieMediaType.Movie))!.Extras;

        Assert.True(MovieShowcaseCatalog.IsCatalogCollection(extras!.Collection!.Id));
    }

    [Fact]
    public async Task GetDetailsAsync_Series_HasCreatorsButNoBudgetSagaOrDirector()
    {
        var extras = (await _sut.GetDetailsAsync(42, MovieMediaType.Tv))!.Extras;

        Assert.NotNull(extras);
        Assert.Null(extras!.Budget);
        Assert.Null(extras.Collection);
        Assert.Null(extras.DirectorId);
        Assert.Contains(extras.Crew, member => member.Job == TmdbCrewJobs.Creator);
        Assert.DoesNotContain(extras.Crew, member => member.Job == TmdbCrewJobs.Director);
    }

    [Fact]
    public async Task GetDirectedMoviesAsync_ListsFilmsTiedToThePerson()
    {
        var details = await _sut.GetDetailsAsync(42, MovieMediaType.Movie);

        var films = await _sut.GetDirectedMoviesAsync(details!.Extras!.DirectorId!.Value);

        Assert.NotEmpty(films);
        Assert.All(films, film => Assert.Equal(MovieMediaType.Movie, film.MediaType));
        Assert.All(films, film => Assert.Contains(details.Extras.DirectorId.Value.ToString(System.Globalization.CultureInfo.InvariantCulture), film.Title));
    }
}
