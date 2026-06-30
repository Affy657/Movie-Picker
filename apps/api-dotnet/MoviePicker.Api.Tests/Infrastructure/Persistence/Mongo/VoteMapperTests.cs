using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class VoteMapperTests
{
    [Fact]
    public void ToDomain_MapsAllFields()
    {
        var doc = new VoteDocument
        {
            Id = "v1",
            EventId = "evt1",
            MovieId = "m1",
            ParticipantId = "p1",
            Value = -1,
            CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2020, 1, 2, 0, 0, 0, DateTimeKind.Utc)
        };

        var domain = VoteMapper.ToDomain(doc);

        Assert.Equal("v1", domain.Id);
        Assert.Equal("evt1", domain.EventId);
        Assert.Equal("m1", domain.MovieId);
        Assert.Equal("p1", domain.ParticipantId);
        Assert.Equal(-1, domain.Value);
        Assert.Equal(new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Equal(new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero), domain.UpdatedAt);
    }
}
