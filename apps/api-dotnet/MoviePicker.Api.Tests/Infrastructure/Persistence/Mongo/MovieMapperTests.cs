using MongoDB.Bson;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MovieMapperTests
{
    private static readonly int[] expectedDomainGenreIds = new[] { 28, 878 };

    [Fact]
    public void ToDomain_MapsAllFields()
    {
        var doc = new MovieDocument
        {
            Id = "mov1",
            EventId = "evt1",
            ParticipantId = "p1",
            TmdbId = 27205,
            Title = "Inception",
            Year = "2010",
            PosterPath = "https://image.tmdb.org/t/p/w154/x.jpg",
            GenreIds = [28, 878],
            CreatedAt = new DateTime(2020, 1, 1, 12, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2020, 1, 2, 12, 0, 0, DateTimeKind.Utc)
        };

        var domain = MovieMapper.ToDomain(doc);

        Assert.Equal("mov1", domain.Id);
        Assert.Equal("evt1", domain.EventId);
        Assert.Equal("p1", domain.ParticipantId);
        Assert.Equal(27205, domain.TmdbId);
        Assert.Equal("Inception", domain.Title);
        Assert.Equal("2010", domain.Year);
        Assert.Equal("https://image.tmdb.org/t/p/w154/x.jpg", domain.PosterPath);
        Assert.Equal(expectedDomainGenreIds, domain.GenreIds);
        Assert.Equal(new DateTimeOffset(2020, 1, 1, 12, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Equal(new DateTimeOffset(2020, 1, 2, 12, 0, 0, TimeSpan.Zero), domain.UpdatedAt);
    }

    [Fact]
    public void ToDomain_NullPosterPath_MapsToNull()
    {
        var doc = new MovieDocument { Id = "m1", EventId = "e1", ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", PosterPath = null, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var domain = MovieMapper.ToDomain(doc);
        Assert.Null(domain.PosterPath);
    }

    [Fact]
    public void ToDomain_NullGenreIds_MapsToEmptyList()
    {
        var doc = new MovieDocument { Id = "m1", EventId = "e1", ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", GenreIds = null, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var domain = MovieMapper.ToDomain(doc);
        Assert.Empty(domain.GenreIds);
    }

    [Fact]
    public void ToDocument_EmptyGenreIds_StoredAsNull()
    {
        var domain = new Movie { Id = "m1", EventId = "e1", ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", GenreIds = [], CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var doc = MovieMapper.ToDocument(domain);
        Assert.Null(doc.GenreIds);
        Assert.Empty(MovieMapper.ToDomain(doc).GenreIds);
    }

    [Fact]
    public void ToDomain_MissingExcludedFromWheel_MapsToFalse()
    {
        var doc = new MovieDocument { Id = "m1", EventId = "e1", ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        Assert.False(MovieMapper.ToDomain(doc).ExcludedFromWheel);
    }

    [Fact]
    public void ToDocument_ExcludedFromWheel_RoundTrips()
    {
        var domain = new Movie { Id = "m1", EventId = "e1", ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", ExcludedFromWheel = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var doc = MovieMapper.ToDocument(domain);
        Assert.True(doc.ExcludedFromWheel);
        Assert.True(MovieMapper.ToDomain(doc).ExcludedFromWheel);
    }

    private static readonly int[] expectedRoundTripGenreIds = new[] { 18, 35 };

    [Fact]
    public void ToDocument_RoundTrip_PreservesData()
    {
        var domain = new Movie
        {
            Id = "mov1",
            EventId = "evt1",
            ParticipantId = "p1",
            TmdbId = 42,
            Title = "Film",
            Year = "2022",
            PosterPath = null,
            GenreIds = [18, 35],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var doc = MovieMapper.ToDocument(domain);
        var back = MovieMapper.ToDomain(doc);
        Assert.Equal(domain.Id, back.Id);
        Assert.Equal(domain.Title, back.Title);
        Assert.Equal(domain.TmdbId, back.TmdbId);
        Assert.Equal(expectedRoundTripGenreIds, back.GenreIds);
    }
}
