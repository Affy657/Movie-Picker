using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class SeenMarkMapperTests
{
    [Fact]
    public void ToDomain_MapsFieldsAndForcesUtc()
    {
        var doc = new SeenMarkDocument
        {
            Id = "s1",
            EventId = "evt1",
            MovieId = "m1",
            ParticipantId = "p1",
            CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Unspecified),
            UpdatedAt = new DateTime(2020, 1, 2, 0, 0, 0, DateTimeKind.Unspecified)
        };

        var domain = SeenMarkMapper.ToDomain(doc);

        Assert.Equal("s1", domain.Id);
        Assert.Equal("evt1", domain.EventId);
        Assert.Equal("m1", domain.MovieId);
        Assert.Equal("p1", domain.ParticipantId);
        Assert.Equal(TimeSpan.Zero, domain.CreatedAt.Offset);
        Assert.Equal(new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Equal(new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero), domain.UpdatedAt);
    }
}
