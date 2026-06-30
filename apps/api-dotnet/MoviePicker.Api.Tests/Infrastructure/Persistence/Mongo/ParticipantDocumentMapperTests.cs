using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class ParticipantDocumentMapperTests
{
    [Fact]
    public void ToDomain_MapsAllFields()
    {
        var doc = new ParticipantDocument
        {
            Id = "p1",
            EventId = "evt1",
            Pseudo = "Alice",
            UserId = "u1",
            CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2020, 1, 2, 0, 0, 0, DateTimeKind.Utc)
        };

        var domain = ParticipantDocumentMapper.ToDomain(doc);

        Assert.Equal("p1", domain.Id);
        Assert.Equal("evt1", domain.EventId);
        Assert.Equal("Alice", domain.Pseudo);
        Assert.Equal("u1", domain.UserId);
        Assert.Equal(new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Equal(new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero), domain.UpdatedAt);
    }

    [Fact]
    public void ToDocument_BlankUserId_BecomesNull()
    {
        var participant = new Participant
        {
            Id = "p1",
            EventId = "evt1",
            Pseudo = "Alice",
            UserId = "   ",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var doc = ParticipantDocumentMapper.ToDocument(participant);

        Assert.Null(doc.UserId);
    }

    [Fact]
    public void RoundTrip_PreservesFields()
    {
        var participant = new Participant
        {
            Id = "p1",
            EventId = "evt1",
            Pseudo = "Alice",
            UserId = "u1",
            CreatedAt = new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero)
        };

        var back = ParticipantDocumentMapper.ToDomain(ParticipantDocumentMapper.ToDocument(participant));

        Assert.Equal(participant.Id, back.Id);
        Assert.Equal(participant.EventId, back.EventId);
        Assert.Equal(participant.Pseudo, back.Pseudo);
        Assert.Equal(participant.UserId, back.UserId);
        Assert.Equal(participant.CreatedAt, back.CreatedAt);
        Assert.Equal(participant.UpdatedAt, back.UpdatedAt);
    }
}
