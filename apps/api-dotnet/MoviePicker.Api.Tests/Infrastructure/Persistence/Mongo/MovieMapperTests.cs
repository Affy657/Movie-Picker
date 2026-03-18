using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MongoDB.Bson;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MovieMapperTests
{
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
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var doc = MovieMapper.ToDocument(domain);
        var back = MovieMapper.ToDomain(doc);
        Assert.Equal(domain.Id, back.Id);
        Assert.Equal(domain.Title, back.Title);
        Assert.Equal(domain.TmdbId, back.TmdbId);
    }
}
