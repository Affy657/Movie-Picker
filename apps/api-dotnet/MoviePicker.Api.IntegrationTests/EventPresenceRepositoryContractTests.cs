using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventPresenceRepositoryContractTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 20, 0, 0, TimeSpan.Zero);

    private readonly MoviePickerApplicationFactory _factory;

    public EventPresenceRepositoryContractTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static string NewId() => ObjectId.GenerateNewId().ToString();

    private async Task WithRepositoryAsync(Func<IEventPresenceRepository, Task> act)
    {
        using var scope = _factory.Services.CreateScope();
        await act(scope.ServiceProvider.GetRequiredService<IEventPresenceRepository>());
    }

    [Fact]
    public async Task Touch_ListsTheParticipantUntilThePresenceExpires()
    {
        var eventId = NewId();
        var participantId = NewId();

        await WithRepositoryAsync(async presence =>
        {
            await presence.TouchAsync(eventId, participantId, Now.AddSeconds(30));

            Assert.Equal(
                [new ParticipantPresence(participantId, Proposing: false)],
                await presence.ListActiveAsync(eventId, Now));
            Assert.Empty(await presence.ListActiveAsync(eventId, Now.AddSeconds(31)));
        });
    }

    [Fact]
    public async Task SetProposing_ThenTouch_KeepsTheParticipantProposing()
    {
        var eventId = NewId();
        var participantId = NewId();

        await WithRepositoryAsync(async presence =>
        {
            await presence.SetProposingAsync(eventId, participantId, Now.AddSeconds(30), Now.AddSeconds(30));
            await presence.TouchAsync(eventId, participantId, Now.AddSeconds(40));

            Assert.Equal(
                [new ParticipantPresence(participantId, Proposing: true)],
                await presence.ListActiveAsync(eventId, Now.AddSeconds(10)));
        });
    }

    [Fact]
    public async Task ProposingSignalPastItsDeadline_ReadsAsPresentButNotProposing()
    {
        var eventId = NewId();
        var participantId = NewId();

        await WithRepositoryAsync(async presence =>
        {
            await presence.SetProposingAsync(eventId, participantId, Now.AddSeconds(60), Now.AddSeconds(30));

            Assert.Equal(
                [new ParticipantPresence(participantId, Proposing: false)],
                await presence.ListActiveAsync(eventId, Now.AddSeconds(45)));
        });
    }

    [Fact]
    public async Task SetProposingOff_ClearsTheSignal()
    {
        var eventId = NewId();
        var participantId = NewId();

        await WithRepositoryAsync(async presence =>
        {
            await presence.SetProposingAsync(eventId, participantId, Now.AddSeconds(30), Now.AddSeconds(30));
            await presence.SetProposingAsync(eventId, participantId, Now.AddSeconds(30), null);

            Assert.False(Assert.Single(await presence.ListActiveAsync(eventId, Now)).Proposing);
        });
    }

    [Fact]
    public async Task ListActive_OnlyReturnsTheRequestedEvent_InParticipantOrder()
    {
        var eventId = NewId();
        var otherEventId = NewId();
        var first = "a" + NewId()[1..];
        var second = "b" + NewId()[1..];

        await WithRepositoryAsync(async presence =>
        {
            await presence.TouchAsync(eventId, second, Now.AddSeconds(30));
            await presence.TouchAsync(eventId, first, Now.AddSeconds(30));
            await presence.TouchAsync(otherEventId, NewId(), Now.AddSeconds(30));

            Assert.Equal(
                [first, second],
                (await presence.ListActiveAsync(eventId, Now)).Select(p => p.ParticipantId));
        });
    }
}
