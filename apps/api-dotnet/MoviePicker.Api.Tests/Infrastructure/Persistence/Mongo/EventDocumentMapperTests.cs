using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Tests.Builders;
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
            Winners = [],
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
        Assert.Empty(domain.Winners);
        Assert.Equal(new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Equal(new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero), domain.UpdatedAt);
        Assert.Null(domain.CreatorUserId);
    }

    [Fact]
    public void ToDomain_And_ToDocument_RoundTrip_CreatorUserId()
    {
        var doc = new EventDocument
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "s",
            CreatorUserId = "507f1f77bcf86cd799439011",
            Config = null,
            ClosedAt = null,
            Winners = [],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var domain = EventDocumentMapper.ToDomain(doc);
        Assert.Equal("507f1f77bcf86cd799439011", domain.CreatorUserId);

        var back = EventDocumentMapper.ToDocument(domain);
        Assert.Equal(doc.CreatorUserId, back.CreatorUserId);
    }

    [Fact]
    public void ToDomain_WithConfig_MapsConfig()
    {
        var config = new EventConfigDocument
        {
            Theme = "SF",
            MaxProposalsPerParticipant = 5
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
            Winners = [],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var domain = EventDocumentMapper.ToDomain(doc);

        Assert.NotNull(domain.Config);
        Assert.Equal("SF", domain.Config.Theme);
        Assert.Equal(5, domain.Config.MaxProposalsPerParticipant);
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
            Winners = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var doc = EventDocumentMapper.ToDocument(evt);
        var back = EventDocumentMapper.ToDomain(doc);
        Assert.Equal(evt.Id, back.Id);
        Assert.Equal(evt.Config?.Theme, back.Config?.Theme);
        Assert.Equal(evt.Config?.MaxProposalsPerParticipant, back.Config?.MaxProposalsPerParticipant);
        Assert.Equal(WheelMode.WeightedByVotes, back.Config?.WheelMode);
    }

    [Fact]
    public void ToDomain_WithWheelMode_RoundTrips()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "s",
            Config = new EventConfig
            {
                WheelMode = WheelMode.WeightedByVotes
            },
            ClosedAt = null,
            Winners = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var doc = EventDocumentMapper.ToDocument(evt);
        var back = EventDocumentMapper.ToDomain(doc);
        Assert.Equal(WheelMode.WeightedByVotes, back.Config?.WheelMode);
    }

    [Fact]
    public void ToDomain_MaxProposals_ReadsValue()
    {
        var config = new EventConfigDocument
        {
            MaxProposalsPerParticipant = 7
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
            Winners = [],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var domain = EventDocumentMapper.ToDomain(doc);

        Assert.Equal(7, domain.Config?.MaxProposalsPerParticipant);
    }

    [Fact]
    public void ToDocument_WithWinnerPickedAt_RoundTrips()
    {
        var pickedAt = new DateTimeOffset(2026, 5, 1, 18, 30, 0, TimeSpan.Zero);
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "s",
            Winners = [TestWinners.Pick("mov1", WinnerPickMethod.Wheel, pickedAt)],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var back = EventDocumentMapper.ToDomain(EventDocumentMapper.ToDocument(evt));

        var winner = Assert.Single(back.Winners);
        Assert.Equal("mov1", winner.MovieId);
        Assert.Equal(WinnerPickMethod.Wheel, winner.Method);
        Assert.Equal(pickedAt, winner.PickedAt);
    }

    [Fact]
    public void ToDomain_LegacySingleWinnerFields_BecomeAOneEntryPalmares()
    {
        var pickedAt = new DateTime(2026, 5, 1, 18, 0, 0, DateTimeKind.Utc);
        var doc = new EventDocument
        {
            Id = "507f1f77bcf86cd799439011",
            Title = "Soirée",
            Date = "2026-05-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = "s",
            WinnerMovieId = "507f1f77bcf86cd799439012",
            WinnerPickMethod = "manual",
            WinnerPickedAt = pickedAt,
            CreatedAt = pickedAt,
            UpdatedAt = pickedAt
        };

        var domain = EventDocumentMapper.ToDomain(doc);

        var winner = Assert.Single(domain.Winners);
        Assert.Equal("507f1f77bcf86cd799439012", winner.MovieId);
        Assert.Equal(WinnerPickMethod.Manual, winner.Method);
        Assert.Equal(new DateTimeOffset(pickedAt, TimeSpan.Zero), winner.PickedAt);
    }

    [Fact]
    public void ToDomain_LegacyWinnerWithoutPickedAt_FallsBackToTheUpdateDate()
    {
        var updatedAt = new DateTime(2026, 5, 2, 9, 0, 0, DateTimeKind.Utc);
        var doc = new EventDocument
        {
            Id = "507f1f77bcf86cd799439011",
            Slug = "s",
            WinnerMovieId = "507f1f77bcf86cd799439012",
            CreatedAt = updatedAt,
            UpdatedAt = updatedAt
        };

        var winner = Assert.Single(EventDocumentMapper.ToDomain(doc).Winners);

        Assert.Equal(new DateTimeOffset(updatedAt, TimeSpan.Zero), winner.PickedAt);
        Assert.Equal(WinnerPickMethod.Wheel, winner.Method);
    }

    [Fact]
    public void ToDomain_WinnersArrayWins_OverTheLegacyFields()
    {
        var doc = new EventDocument
        {
            Id = "507f1f77bcf86cd799439011",
            Slug = "s",
            WinnerMovieId = "507f1f77bcf86cd799439012",
            Winners =
            [
                new EventWinnerDocument
                {
                    MovieId = "507f1f77bcf86cd799439013",
                    PickMethod = "wheel",
                    PickedAt = new DateTime(2026, 5, 3, 20, 0, 0, DateTimeKind.Utc)
                }
            ],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var winner = Assert.Single(EventDocumentMapper.ToDomain(doc).Winners);

        Assert.Equal("507f1f77bcf86cd799439013", winner.MovieId);
    }

    [Fact]
    public void ToDocument_KeepsTheFirstWinnerInTheLegacyField()
    {
        var evt = new Event
        {
            Id = "evt1",
            Slug = "s",
            Winners = TestWinners.Won("mov1", "mov2"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var doc = EventDocumentMapper.ToDocument(evt);

        Assert.Equal("mov1", doc.WinnerMovieId);
        Assert.Equal(2, doc.Winners!.Count);
    }

    [Fact]
    public void ToDocument_WinnerCountRoundTrips()
    {
        var evt = new Event
        {
            Id = "evt1",
            Slug = "s",
            Config = new EventConfig { WinnerCount = 4 },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var back = EventDocumentMapper.ToDomain(EventDocumentMapper.ToDocument(evt));

        Assert.Equal(4, back.Config!.WinnerCount);
    }

    [Fact]
    public void ToDomain_ConfigWithoutWinnerCount_DefaultsToOne()
    {
        var doc = new EventDocument
        {
            Id = "507f1f77bcf86cd799439011",
            Slug = "s",
            Config = new EventConfigDocument(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        Assert.Equal(EventConfig.DefaultWinnerCount, EventDocumentMapper.ToDomain(doc).Config!.WinnerCount);
    }
}
