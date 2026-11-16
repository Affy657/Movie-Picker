using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventLive;

public sealed class EventLiveHubTests : IAsyncLifetime
{
    private static readonly TimeSpan SignalTimeout = TimeSpan.FromSeconds(5);

    private readonly InMemoryEventRepository _events = new();
    private readonly Mock<IEventPresenceRepository> _presence = new();
    private readonly ServiceProvider _services;
    private readonly EventLiveHub _sut;
    private IReadOnlyList<ParticipantPresence> _present = [];
    private int _presenceReads;
    private Event _event = null!;

    public EventLiveHubTests()
    {
        _presence
            .Setup(r => r.ListActiveAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                Interlocked.Increment(ref _presenceReads);
                return _present;
            });

        var services = new ServiceCollection();
        services.AddSingleton<IEventRepository>(_events);
        services.AddSingleton(_presence.Object);
        _services = services.BuildServiceProvider();

        _sut = new EventLiveHub(
            _services.GetRequiredService<IServiceScopeFactory>(),
            TimeProvider.System,
            Options.Create(new EventLiveOptions { PollInterval = TimeSpan.FromMilliseconds(20) }),
            NullLogger<EventLiveHub>.Instance);
    }

    public async Task InitializeAsync() =>
        _event = await _events.AddAsync(new EventEntityBuilder().WithId("evt-live").WithSlug("soiree-live").Build());

    public async Task DisposeAsync() => await _services.DisposeAsync();

    private static async Task<T> NextAsync<T>(EventLiveSubscription subscription) where T : IEventLiveSignal
    {
        using var timeout = new CancellationTokenSource(SignalTimeout);
        while (true)
        {
            var signal = await subscription.Signals.ReadAsync(timeout.Token);
            if (signal is T typed)
                return typed;
        }
    }

    private static async Task<bool> ReceivesAsync<T>(EventLiveSubscription subscription, TimeSpan within) where T : IEventLiveSignal
    {
        using var timeout = new CancellationTokenSource(within);
        try
        {
            while (true)
            {
                if (await subscription.Signals.ReadAsync(timeout.Token) is T)
                    return true;
            }
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }

    [Fact]
    public async Task Subscribe_FirstPoll_SendsThePresenceSnapshot()
    {
        _present = [new ParticipantPresence("p-alice", Proposing: false)];

        using var subscription = _sut.Subscribe(_event.Id, _event.Slug);

        var presence = await NextAsync<EventPresenceSignal>(subscription);
        Assert.Equal([new ParticipantPresence("p-alice", false)], presence.Participants);
    }

    [Fact]
    public async Task Subscribe_WhenTheEventWriteSeqMoves_SignalsChangedToEverySubscriber()
    {
        using var first = _sut.Subscribe(_event.Id, _event.Slug);
        using var second = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(first);

        await _events.MarkChangedAsync(_event.Id);

        var changedForFirst = await NextAsync<EventChangedSignal>(first);
        var changedForSecond = await NextAsync<EventChangedSignal>(second);
        Assert.Equal(changedForFirst.Stamp, changedForSecond.Stamp);
    }

    [Fact]
    public async Task Subscribe_WhenNothingMoves_SignalsNoChange()
    {
        using var subscription = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(subscription);

        Assert.False(await ReceivesAsync<EventChangedSignal>(subscription, TimeSpan.FromMilliseconds(200)));
    }

    [Fact]
    public async Task Subscribe_WhenAParticipantStartsProposing_SignalsTheNewPresence()
    {
        _present = [new ParticipantPresence("p-alice", Proposing: false)];
        using var subscription = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(subscription);

        _present = [new ParticipantPresence("p-alice", Proposing: true)];

        var presence = await NextAsync<EventPresenceSignal>(subscription);
        Assert.True(Assert.Single(presence.Participants).Proposing);
    }

    [Fact]
    public async Task Subscribe_LateSubscriber_ReceivesTheLastPresenceAtOnce()
    {
        _present = [new ParticipantPresence("p-alice", Proposing: false)];
        using var first = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(first);

        using var late = _sut.Subscribe(_event.Id, _event.Slug);

        Assert.True(late.Signals.TryRead(out var signal));
        var presence = Assert.IsType<EventPresenceSignal>(signal);
        Assert.Equal("p-alice", Assert.Single(presence.Participants).ParticipantId);
    }

    [Fact]
    public async Task Dispose_LastSubscriber_StopsPollingTheEvent()
    {
        var subscription = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(subscription);

        subscription.Dispose();
        await Task.Delay(100);
        var readsAfterRelease = Volatile.Read(ref _presenceReads);
        await Task.Delay(200);

        Assert.Equal(readsAfterRelease, Volatile.Read(ref _presenceReads));
        Assert.True(subscription.Signals.Completion.IsCompleted);
    }

    [Fact]
    public async Task Poll_EventDeleted_SignalsChangedOnceSoClientsReload()
    {
        using var subscription = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(subscription);

        await _events.DeleteAsync(_event.Id);

        await NextAsync<EventChangedSignal>(subscription);
        Assert.False(await ReceivesAsync<EventChangedSignal>(subscription, TimeSpan.FromMilliseconds(200)));
    }

    [Fact]
    public async Task Poll_RepositoryCancellingOnItsOwn_KeepsPolling()
    {
        var calls = 0;
        _presence
            .Setup(r => r.ListActiveAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => Interlocked.Increment(ref calls) == 1
                ? throw new OperationCanceledException("driver gave up")
                : (IReadOnlyList<ParticipantPresence>)[new ParticipantPresence("p-carla", false)]);

        using var subscription = _sut.Subscribe(_event.Id, _event.Slug);

        var presence = await NextAsync<EventPresenceSignal>(subscription);
        Assert.Equal("p-carla", Assert.Single(presence.Participants).ParticipantId);
    }

    [Fact]
    public async Task Subscribe_AfterTheLastSubscriberLeft_StartsAFreshWatch()
    {
        var first = _sut.Subscribe(_event.Id, _event.Slug);
        await NextAsync<EventPresenceSignal>(first);
        first.Dispose();

        using var second = _sut.Subscribe(_event.Id, _event.Slug);

        var presence = await NextAsync<EventPresenceSignal>(second);
        Assert.Empty(presence.Participants);
    }

    [Fact]
    public async Task Poll_RepositoryFailure_KeepsPolling()
    {
        var calls = 0;
        _presence
            .Setup(r => r.ListActiveAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => Interlocked.Increment(ref calls) == 1
                ? throw new TimeoutException("mongo hiccup")
                : (IReadOnlyList<ParticipantPresence>)[new ParticipantPresence("p-bob", false)]);

        using var subscription = _sut.Subscribe(_event.Id, _event.Slug);

        var presence = await NextAsync<EventPresenceSignal>(subscription);
        Assert.Equal("p-bob", Assert.Single(presence.Participants).ParticipantId);
    }
}
