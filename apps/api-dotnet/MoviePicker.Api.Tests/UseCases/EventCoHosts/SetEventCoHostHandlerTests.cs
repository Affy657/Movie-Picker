using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventCoHosts;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventCoHosts;

public sealed class SetEventCoHostHandlerTests
{
    private const string Creator = "creator";
    private const string Guest = "guest";

    private static readonly DateTimeOffset Now = new(2026, 11, 25, 18, 0, 0, TimeSpan.Zero);

    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly FixedClock _clock = new(Now);

    private SetEventCoHostHandler Handler(IUnitOfWork? unitOfWork = null) =>
        new(_events, _participants, unitOfWork ?? new InMemoryUnitOfWork(), _clock);

    private async Task<(Event Night, Participant Guest, Participant Creator)> NightAsync(
        DateTimeOffset? closedAt = null,
        IReadOnlyList<string>? coHosts = null)
    {
        var night = await _events.AddAsync(new Event
        {
            Title = "Jeudi ciné",
            Date = "2026-11-27",
            Time = "21:00",
            Slug = "jeudi-cine",
            CreatorUserId = Creator,
            ClosedAt = closedAt,
            CoHostUserIds = coHosts ?? [],
            CreatedAt = Now,
            UpdatedAt = Now
        });
        var creator = await _participants.AddAsync(Participant(night.Id, "Adrien", Creator));
        var guest = await _participants.AddAsync(Participant(night.Id, "Léa", Guest));
        return (night, guest, creator);
    }

    private static Participant Participant(string eventId, string pseudo, string? userId) => new()
    {
        EventId = eventId,
        Pseudo = pseudo,
        UserId = userId,
        CreatedAt = Now,
        UpdatedAt = Now
    };

    private async Task<Event> ReloadAsync() => (await _events.GetBySlugAsync("jeudi-cine"))!;

    [Fact]
    public async Task AParticipantWhoDeletesTheirAccountMeanwhile_IsNotNamed()
    {
        var (_, guest, _) = await NightAsync();
        var accountDeletedMeanwhile = new InterleavedUnitOfWork(
            () => _participants.AnonymizeByUserIdAsync(Guest, "Ancien compte"));

        var ex = await Assert.ThrowsAsync<BadRequestException>(
            () => Handler(accountDeletedMeanwhile).HandleAsync(Creator, "jeudi-cine", guest.Id, coHost: true));

        Assert.Equal(ErrorCodes.CoHostTargetInvalid, ex.Reason);
        Assert.Empty((await ReloadAsync()).CoHostUserIds);
    }

    [Fact]
    public async Task TheCreatorNamesAParticipantCoHost()
    {
        var (_, guest, _) = await NightAsync();

        await Handler().HandleAsync(Creator, "jeudi-cine", guest.Id, coHost: true);

        Assert.Equal([Guest], (await ReloadAsync()).CoHostUserIds);
    }

    [Fact]
    public async Task NamingTheSameCoHostTwice_KeepsASingleEntryWithoutWriting()
    {
        var (night, guest, _) = await NightAsync(coHosts: [Guest]);

        await Handler().HandleAsync(Creator, "jeudi-cine", guest.Id, coHost: true);

        var reloaded = await ReloadAsync();
        Assert.Equal([Guest], reloaded.CoHostUserIds);
        Assert.Equal(night.WriteSeq, reloaded.WriteSeq);
    }

    [Fact]
    public async Task TheCreatorWithdrawsTheRole()
    {
        var (night, guest, _) = await NightAsync(coHosts: [Guest]);

        await Handler().HandleAsync(Creator, "jeudi-cine", guest.Id, coHost: false);

        var reloaded = await ReloadAsync();
        Assert.Empty(reloaded.CoHostUserIds);
        Assert.True(reloaded.WriteSeq > night.WriteSeq);
    }

    [Fact]
    public async Task ACoHostCannotNameAnotherCoHost()
    {
        var (night, _, _) = await NightAsync(coHosts: [Guest]);
        var third = await _participants.AddAsync(Participant(night.Id, "Tom", "third"));

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            Handler().HandleAsync(Guest, "jeudi-cine", third.Id, coHost: true));

        Assert.Equal(ErrorCodes.CreatorOnlyCoHosts, ex.Reason);
        Assert.Equal([Guest], (await ReloadAsync()).CoHostUserIds);
    }

    [Fact]
    public async Task ACoHostCannotWithdrawTheirOwnRoleThroughThisRoute()
    {
        var (_, guest, _) = await NightAsync(coHosts: [Guest]);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            Handler().HandleAsync(Guest, "jeudi-cine", guest.Id, coHost: false));

        Assert.Equal(ErrorCodes.CreatorOnlyCoHosts, ex.Reason);
    }

    [Fact]
    public async Task TheCreatorCannotBeNamedCoHost()
    {
        var (_, _, creator) = await NightAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            Handler().HandleAsync(Creator, "jeudi-cine", creator.Id, coHost: true));

        Assert.Equal(ErrorCodes.CoHostTargetInvalid, ex.Reason);
    }

    [Fact]
    public async Task AParticipantWithoutAccountCannotBeNamedCoHost()
    {
        var (night, _, _) = await NightAsync();
        var legacy = await _participants.AddAsync(Participant(night.Id, "Invité", userId: null));

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            Handler().HandleAsync(Creator, "jeudi-cine", legacy.Id, coHost: true));

        Assert.Equal(ErrorCodes.CoHostTargetInvalid, ex.Reason);
    }

    [Fact]
    public async Task AnUnknownParticipant_IsNotFound()
    {
        await NightAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            Handler().HandleAsync(Creator, "jeudi-cine", "missing", coHost: true));

        Assert.Equal(ErrorCodes.ParticipantNotFound, ex.Reason);
    }

    [Fact]
    public async Task AFinishedNight_RefusesANewCoHost()
    {
        var (_, guest, _) = await NightAsync(closedAt: Now.AddHours(-1));

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Handler().HandleAsync(Creator, "jeudi-cine", guest.Id, coHost: true));

        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
        Assert.Empty((await ReloadAsync()).CoHostUserIds);
    }

    [Fact]
    public async Task AFinishedNight_StillLetsTheCreatorWithdrawTheRole()
    {
        var (_, guest, _) = await NightAsync(closedAt: Now.AddHours(-1), coHosts: [Guest]);

        await Handler().HandleAsync(Creator, "jeudi-cine", guest.Id, coHost: false);

        Assert.Empty((await ReloadAsync()).CoHostUserIds);
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class InterleavedUnitOfWork(Func<Task> meanwhile) : IUnitOfWork
    {
        public async Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default)
        {
            await meanwhile();
            await work(ct);
        }
    }
}
