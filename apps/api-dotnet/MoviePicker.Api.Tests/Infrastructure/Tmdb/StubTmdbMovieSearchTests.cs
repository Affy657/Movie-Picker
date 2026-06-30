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
    }
}
