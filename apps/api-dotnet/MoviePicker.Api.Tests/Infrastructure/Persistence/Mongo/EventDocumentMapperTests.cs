using MongoDB.Bson;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class EventDocumentMapperTests
{
    [Fact]
    public void ToDomain_WithoutConfig_MapsBasicFields()
    {
        var doc = new EventDocument
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "soiree",
            Config = null,
            ClosedAt = null,
            WinnerMovieId = null,
            CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2020, 1, 2, 0, 0, 0, DateTimeKind.Utc)
        };

        var domain = EventDocumentMapper.ToDomain(doc);

        Assert.Equal("evt1", domain.Id);
        Assert.Equal("Soirée", domain.Title);
        Assert.Equal("2030-01-01", domain.Date);
        Assert.Equal("20:00", domain.Time);
        Assert.Equal("ht", domain.HostToken);
        Assert.Equal("soiree", domain.Slug);
        Assert.Null(domain.Config);
        Assert.Null(domain.ClosedAt);
        Assert.Null(domain.WinnerMovieId);
        Assert.Equal(new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Equal(new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero), domain.UpdatedAt);
    }

    [Fact]
    public void ToDomain_WithConfig_MapsConfig()
    {
        var config = new BsonDocument
        {
            ["theme"] = "SF",
            ["endDate"] = new DateTime(2030, 6, 1, 22, 0, 0, DateTimeKind.Utc),
            ["maxProposalsPerParticipant"] = 5
        };
        var doc = new EventDocument
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "s",
            Config = config,
            ClosedAt = null,
            WinnerMovieId = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var domain = EventDocumentMapper.ToDomain(doc);

        Assert.NotNull(domain.Config);
        Assert.Equal("SF", domain.Config.Theme);
        Assert.Equal(5, domain.Config.MaxProposalsPerParticipant);
        Assert.NotNull(domain.Config.EndDate);
        Assert.Equal(2030, domain.Config.EndDate!.Value.Year);
    }

    [Fact]
    public void ToDocument_WithConfig_RoundTrips()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "s",
            Config = new EventConfig { Theme = "Comédie", MaxProposalsPerParticipant = 3 },
            ClosedAt = null,
            WinnerMovieId = null,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var doc = EventDocumentMapper.ToDocument(evt);
        var back = EventDocumentMapper.ToDomain(doc);
        Assert.Equal(evt.Id, back.Id);
        Assert.Equal(evt.Config?.Theme, back.Config?.Theme);
        Assert.Equal(evt.Config?.MaxProposalsPerParticipant, back.Config?.MaxProposalsPerParticipant);
    }
}
