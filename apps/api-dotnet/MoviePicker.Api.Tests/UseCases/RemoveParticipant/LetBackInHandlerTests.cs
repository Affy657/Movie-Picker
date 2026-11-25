using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RemoveParticipant;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.RemoveParticipant;

public sealed class LetBackInHandlerTests
{
    private const string Creator = "creator";
    private const string CoHost = "co-host";
    private const string Removed = "removed";
    private const string AlsoRemoved = "also-removed";
    private const string HostToken = "host-token";

    private static readonly DateTimeOffset Now = new(2026, 11, 25, 18, 0, 0, TimeSpan.Zero);

    private readonly InMemoryEventRepository _events = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();

    private LetBackInHandler Handler() =>
        new(_events, _hostToken.Object, _currentUser.Object, new FixedClock(Now));

    private Task<Event> NightAsync(DateTimeOffset? closedAt = null) =>
        _events.AddAsync(new Event
        {
            Title = "Jeudi ciné",
            Date = "2026-11-27",
            Time = "21:00",
            Slug = "jeudi-cine",
            HostToken = HostToken,
            CreatorUserId = Creator,
            CoHostUserIds = [CoHost],
            RemovedUserIds = [Removed, AlsoRemoved],
            ClosedAt = closedAt,
            CreatedAt = Now,
            UpdatedAt = Now
        });

    private async Task<Event> ReloadAsync() => (await _events.GetByIdOrSlugAsync("jeudi-cine"))!;

    private void SignedInAs(string? userId) => _currentUser.Setup(c => c.GetUserId()).Returns(userId);

    [Theory]
    [InlineData(Creator)]
    [InlineData(CoHost)]
    public async Task AHostLetsARemovedAccountBackIn_AndOnlyThatOne(string host)
    {
        await NightAsync();
        SignedInAs(host);

        await Handler().HandleAsync("jeudi-cine", Removed);

        var night = await ReloadAsync();
        Assert.Equal([AlsoRemoved], night.RemovedUserIds);
        Assert.Equal(Now, night.UpdatedAt);
    }

    [Fact]
    public async Task TheHostLinkLetsARemovedAccountBackIn()
    {
        await NightAsync();
        SignedInAs(null);
        _hostToken.Setup(h => h.GetHostToken()).Returns(HostToken);

        await Handler().HandleAsync("jeudi-cine", Removed);

        Assert.DoesNotContain(Removed, (await ReloadAsync()).RemovedUserIds);
    }

    [Theory]
    [InlineData("guest")]
    [InlineData(Removed)]
    [InlineData(null)]
    public async Task SomeoneWhoDoesNotHost_CannotLetAnyoneBackIn(string? viewer)
    {
        await NightAsync();
        SignedInAs(viewer);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Handler().HandleAsync("jeudi-cine", Removed));

        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
        Assert.Contains(Removed, (await ReloadAsync()).RemovedUserIds);
    }

    [Fact]
    public async Task AFinishedNight_KeepsEveryoneOut()
    {
        await NightAsync(closedAt: Now.AddHours(-1));
        SignedInAs(Creator);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Handler().HandleAsync("jeudi-cine", Removed));

        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
        Assert.Contains(Removed, (await ReloadAsync()).RemovedUserIds);
    }

    [Fact]
    public async Task AnAccountNobodyRemoved_LeavesTheNightUntouched()
    {
        var before = await NightAsync();
        SignedInAs(Creator);

        await Handler().HandleAsync("jeudi-cine", "never-removed");

        var after = await ReloadAsync();
        Assert.Equal(before.Version, after.Version);
        Assert.Equal(before.WriteSeq, after.WriteSeq);
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
