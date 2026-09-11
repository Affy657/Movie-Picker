using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;
using MoviePicker.Api.Tests.Builders;

namespace MoviePicker.Api.Tests.UseCases.RecurringEvents;

public sealed class RecurringEventPassTests
{
    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FakeTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private static readonly DateTimeOffset Now = new(2026, 9, 20, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly RecurringEventPass _sut;

    public RecurringEventPassTests()
    {
        _events
            .Setup(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e with { Id = "evt-next" });
        _events
            .Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
        _participants
            .Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant p, CancellationToken _) => p with { Id = "part-next" });
        _users
            .Setup(r => r.GetByIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "user-1", Email = "hote@example.com", DisplayName = "Camille" });

        _sut = new RecurringEventPass(
            _events.Object,
            _participants.Object,
            _users.Object,
            new InMemoryUnitOfWork(),
            new FakeTimeProvider(Now),
            NullLogger<RecurringEventPass>.Instance);
    }

    private static Event FinishedWeekly() => new()
    {
        Id = "evt-1",
        Title = "Cine-club du mercredi",
        Date = "2026-09-09",
        Time = "20:30",
        Slug = "cine-club",
        HostToken = "host-token",
        CreatorUserId = "user-1",
        Config = new EventConfig
        {
            Theme = "Horreur",
            ThemeColor = 280,
            MaxProposalsPerParticipant = 3,
            MaxParticipants = 8,
            WheelMode = WheelMode.StrictRandom,
            RichSharePreview = true,
            AllowSeries = true
        },
        Recurrence = RecurrenceFrequency.Weekly,
        ClosedAt = new DateTimeOffset(2026, 9, 10, 0, 0, 0, TimeSpan.Zero),
        CreatedAt = new DateTimeOffset(2026, 9, 1, 0, 0, 0, TimeSpan.Zero),
        UpdatedAt = new DateTimeOffset(2026, 9, 10, 0, 0, 0, TimeSpan.Zero)
    };

    private void GivenCandidates(params Event[] candidates) =>
        _events
            .Setup(r => r.ListRecurringAwaitingNextOccurrenceAsync(
                It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(candidates);

    private Event CapturedNewEvent()
    {
        Event? captured = null;
        _events.Verify(
            r => r.AddAsync(It.Is<Event>(e => Capture(e, ref captured)), It.IsAny<CancellationToken>()),
            Times.Once);
        return captured!;
    }

    private static bool Capture(Event candidate, ref Event? slot)
    {
        slot = candidate;
        return true;
    }

    [Fact]
    public async Task RunAsync_FinishedRecurringEvent_CreatesTheNextOccurrenceOnTheFollowingSlot()
    {
        GivenCandidates(FinishedWeekly());

        var result = await _sut.RunAsync();

        Assert.Equal(1, result.Created);
        var created = CapturedNewEvent();
        Assert.Equal("2026-09-23", created.Date);
        Assert.Equal("20:30", created.Time);
        Assert.Equal("Cine-club du mercredi", created.Title);
    }

    [Fact]
    public async Task RunAsync_FinishedRecurringEvent_CarriesTheConfigurationOverToTheNewOccurrence()
    {
        GivenCandidates(FinishedWeekly());

        await _sut.RunAsync();

        var created = CapturedNewEvent();
        Assert.Equal("Horreur", created.Config!.Theme);
        Assert.Equal(280, created.Config.ThemeColor);
        Assert.Equal(3, created.Config.MaxProposalsPerParticipant);
        Assert.Equal(8, created.Config.MaxParticipants);
        Assert.Equal(WheelMode.StrictRandom, created.Config.WheelMode);
        Assert.True(created.Config.AllowSeries);
    }

    [Fact]
    public async Task RunAsync_NewOccurrence_StartsEmptyWithItsOwnIdentity()
    {
        GivenCandidates(FinishedWeekly());

        await _sut.RunAsync();

        var created = CapturedNewEvent();
        Assert.NotEqual("cine-club", created.Slug);
        Assert.NotEqual("host-token", created.HostToken);
        Assert.Null(created.ClosedAt);
        Assert.Empty(created.Winners);
        Assert.Null(created.NextOccurrenceEventId);
        Assert.Equal("evt-1", created.RecurrenceParentEventId);
    }

    [Fact]
    public async Task RunAsync_NewOccurrence_InheritsTheRecurrenceSoTheSeriesKeepsGoing()
    {
        GivenCandidates(FinishedWeekly());

        await _sut.RunAsync();

        Assert.Equal(RecurrenceFrequency.Weekly, CapturedNewEvent().Recurrence);
    }

    [Fact]
    public async Task RunAsync_FinishedRecurringEvent_LinksTheParentToItsSuccessor()
    {
        GivenCandidates(FinishedWeekly());

        await _sut.RunAsync();

        _events.Verify(
            r => r.UpdateAsync(
                It.Is<Event>(e => e.Id == "evt-1" && e.NextOccurrenceEventId == "evt-next"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_FinishedRecurringEvent_PutsTheHostBackInTheNewOccurrence()
    {
        GivenCandidates(FinishedWeekly());

        await _sut.RunAsync();

        _participants.Verify(
            r => r.AddAsync(
                It.Is<Participant>(p => p.EventId == "evt-next" && p.UserId == "user-1" && p.Pseudo == "Camille"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_EventStillRunning_CreatesNothing()
    {
        GivenCandidates(FinishedWeekly() with { Date = "2026-09-30", ClosedAt = null });

        var result = await _sut.RunAsync();

        Assert.Equal(0, result.Created);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_ParentAlreadyLinkedToASuccessor_CreatesNothing()
    {
        GivenCandidates(FinishedWeekly() with { NextOccurrenceEventId = "evt-already" });

        var result = await _sut.RunAsync();

        Assert.Equal(0, result.Created);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_SeriesDormantBeyondTheCatchUpLimit_StopsTheRecurrence()
    {
        GivenCandidates(FinishedWeekly() with
        {
            Date = "2020-01-01",
            ClosedAt = new DateTimeOffset(2020, 1, 2, 0, 0, 0, TimeSpan.Zero)
        });

        var result = await _sut.RunAsync();

        Assert.Equal(0, result.Created);
        Assert.Equal(1, result.Stopped);
        _events.Verify(
            r => r.UpdateAsync(
                It.Is<Event>(e => e.Id == "evt-1" && e.Recurrence == null),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_CreatorAccountRemoved_StopsTheRecurrence()
    {
        GivenCandidates(FinishedWeekly() with { CreatorUserId = null });

        var result = await _sut.RunAsync();

        Assert.Equal(0, result.Created);
        Assert.Equal(1, result.Stopped);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_UnparseableDate_LeavesTheEventAlone()
    {
        GivenCandidates(FinishedWeekly() with
        {
            Date = "pas-une-date",
            ClosedAt = new DateTimeOffset(2026, 9, 10, 0, 0, 0, TimeSpan.Zero)
        });

        var result = await _sut.RunAsync();

        Assert.Equal(0, result.Created);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunForCreatorAsync_NarrowsTheSweepToThatHostOwnSeries()
    {
        GivenCandidates(FinishedWeekly());

        await _sut.RunForCreatorAsync("user-1");

        _events.Verify(
            r => r.ListRecurringAwaitingNextOccurrenceAsync("user-1", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_SweepsEveryHostSeries()
    {
        GivenCandidates(FinishedWeekly());

        var result = await _sut.RunAsync();

        _events.Verify(
            r => r.ListRecurringAwaitingNextOccurrenceAsync(null, It.IsAny<CancellationToken>()),
            Times.Once);
        Assert.Equal(1, result.Candidates);
    }
}
