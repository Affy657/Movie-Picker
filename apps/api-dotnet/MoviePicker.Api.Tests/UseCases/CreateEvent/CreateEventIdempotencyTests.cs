using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CreateEvent;

public sealed class CreateEventIdempotencyTests
{
    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryUserRepository _users = new();
    private readonly InMemoryParticipantRepository _participants = new();

    private CreateEventHandler Handler(IEventRepository? events = null) =>
        new(events ?? _events, _users, _participants, new InMemoryUnitOfWork(),
            NullLogger<CreateEventHandler>.Instance, TimeProvider.System);

    private async Task<User> SeedHostAsync() => await _users.AddAsync(new User
    {
        Email = "hote@example.com",
        DisplayName = "Hôte",
        Handle = "hote",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    });

    private static CreateEventRequest Request(string? clientRequestId) => new()
    {
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:30",
        ClientRequestId = clientRequestId
    };

    [Fact]
    public async Task HandleAsync_ReplayedWithTheSameClientRequestId_ReturnsTheFirstEventWithoutCreatingAnother()
    {
        var host = await SeedHostAsync();

        var first = await Handler().HandleAsync(Request("req-1"), host.Id);
        var replay = await Handler().HandleAsync(Request("req-1"), host.Id);

        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(first.Slug, replay.Slug);
        Assert.Equal(first.CreatorParticipant!.Id, replay.CreatorParticipant!.Id);
        Assert.Single(await _events.ListAllByCreatorUserIdAsync(host.Id));
    }

    [Fact]
    public async Task HandleAsync_DistinctClientRequestIds_CreateDistinctEvents()
    {
        var host = await SeedHostAsync();

        var first = await Handler().HandleAsync(Request("req-1"), host.Id);
        var second = await Handler().HandleAsync(Request("req-2"), host.Id);

        Assert.NotEqual(first.Id, second.Id);
    }

    [Fact]
    public async Task HandleAsync_WithoutClientRequestId_CreatesAnEventEachTime()
    {
        var host = await SeedHostAsync();

        await Handler().HandleAsync(Request(null), host.Id);
        await Handler().HandleAsync(Request(null), host.Id);

        Assert.Equal(2, (await _events.ListAllByCreatorUserIdAsync(host.Id)).Count);
    }

    [Fact]
    public async Task HandleAsync_ConcurrentReplayLosesTheInsert_ReturnsTheEventThatWon()
    {
        var host = await SeedHostAsync();
        var winner = await Handler().HandleAsync(Request("req-1"), host.Id);
        var stored = await _events.GetByIdOrSlugAsync(winner.Slug);
        var racing = new Mock<IEventRepository>();
        racing.SetupSequence(r => r.FindByCreationRequestAsync(host.Id, "req-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event?)null)
            .ReturnsAsync(stored);
        racing.Setup(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EventCreationReplayedException());

        var replay = await Handler(racing.Object).HandleAsync(Request("req-1"), host.Id);

        Assert.Equal(winner.Id, replay.Id);
    }
}
