using System.Linq;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMyEvents;

public sealed class ListMyEventsHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly ListMyEventsHandler _sut;

    public ListMyEventsHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _sut = new ListMyEventsHandler(_eventRepo.Object, _participantRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_MergesCreatedAndJoined_DedupesByEventId()
    {
        var created = new Event
        {
            Id = "e1",
            Title = "Créée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "c",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.Parse("2026-01-02T00:00:00Z"),
            UpdatedAt = DateTimeOffset.Parse("2026-01-03T00:00:00Z")
        };
        var joinedOnly = new Event
        {
            Id = "e2",
            Title = "Rejointe",
            Date = "2030-02-01",
            Time = "21:00",
            Slug = "j",
            HostToken = "h2",
            CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
            UpdatedAt = DateTimeOffset.Parse("2026-01-04T00:00:00Z")
        };

        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { created });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { "e1", "e2" });
        _eventRepo.Setup(r => r.ListByIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 1 && ids.Contains("e2")), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { joinedOnly });

        var result = await _sut.HandleAsync("u1", limit: 10);

        Assert.Equal(2, result.Events.Count);
        var c = result.Events.Single(x => x.Id == "e1");
        Assert.True(c.IsCreator);
        Assert.True(c.IsParticipant);
        var j = result.Events.Single(x => x.Id == "e2");
        Assert.False(j.IsCreator);
        Assert.True(j.IsParticipant);
        Assert.Equal("Rejointe", result.Events[0].Title);
        Assert.Equal("Créée", result.Events[1].Title);
    }

    [Fact]
    public async Task HandleAsync_RespectsLimit()
    {
        var e1 = new Event
        {
            Id = "a",
            Title = "A",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "a",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-01T00:00:00Z")
        };
        var e2 = new Event
        {
            Id = "b",
            Title = "B",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "b",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-02T00:00:00Z")
        };
        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1, e2 });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());

        var result = await _sut.HandleAsync("u1", limit: 1);

        Assert.Single(result.Events);
        Assert.Equal("b", result.Events[0].Id);
    }
}
