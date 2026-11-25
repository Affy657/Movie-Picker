using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetEligibleFollowsForEvent;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetEligibleFollowsForEvent;

public sealed class GetEligibleFollowsForEventHandlerTests
{
    private const string HostId = "host";

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly GetEligibleFollowsForEventHandler _sut;

    public GetEligibleFollowsForEventHandlerTests()
    {
        _sut = new GetEligibleFollowsForEventHandler(
            _events.Object, _participants.Object, _follows.Object, _users.Object, _notifications.Object);
    }

    private void SetupOwnedEvent() =>
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event { Id = "evt1", CreatorUserId = HostId });

    private static User U(string id) => new() { Id = id, Handle = id, DisplayName = id };


    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(HostId, "evt1"));
    }

    [Fact]
    public async Task HandleAsync_NotCreator_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event { Id = "evt1", CreatorUserId = "other" });

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync(HostId, "evt1"));
    }

    [Fact]
    public async Task HandleAsync_NoFollowing_ReturnsEmpty()
    {
        SetupOwnedEvent();
        _follows.Setup(f => f.GetFollowingIdsAsync(HostId, It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var result = await _sut.HandleAsync(HostId, "evt1");

        Assert.Empty(result.Follows);
    }

    [Fact]
    public async Task HandleAsync_FlagsParticipantsAndInvites_AndSkipsMissingUsers()
    {
        SetupOwnedEvent();
        _follows.Setup(f => f.GetFollowingIdsAsync(HostId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u1", "u2", "u3"]);
        _users.Setup(u => u.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([U("u1"), U("u2")]);
        _participants.Setup(p => p.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = "p1", EventId = "evt1", UserId = "u1" }]);
        _notifications.Setup(n => n.ListUserIdsByTypeAndEventAsync(UserNotificationType.EventInvitation, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HashSet<string> { "u2" });

        var result = await _sut.HandleAsync(HostId, "evt1");

        Assert.Equal(2, result.Follows.Count);
        var u1 = result.Follows.Single(f => f.UserId == "u1");
        var u2 = result.Follows.Single(f => f.UserId == "u2");
        Assert.True(u1.IsAlreadyParticipant);
        Assert.False(u1.IsAlreadyInvited);
        Assert.False(u2.IsAlreadyParticipant);
        Assert.True(u2.IsAlreadyInvited);
    }

    [Fact]
    public async Task HandleAsync_AFriendTheHostRemoved_CanBeInvitedAgain()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event { Id = "evt1", CreatorUserId = HostId, RemovedUserIds = ["u2"] });
        _follows.Setup(f => f.GetFollowingIdsAsync(HostId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u2"]);
        _users.Setup(u => u.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([U("u2")]);
        _participants.Setup(p => p.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _notifications.Setup(n => n.ListUserIdsByTypeAndEventAsync(UserNotificationType.EventInvitation, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HashSet<string> { "u2" });

        var result = await _sut.HandleAsync(HostId, "evt1");

        Assert.False(result.Follows.Single().IsAlreadyInvited);
    }

    [Fact]
    public async Task HandleAsync_CoHost_ListsTheirOwnFollows()
    {
        _events
            .Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event { Id = "evt1", CreatorUserId = HostId, CoHostUserIds = ["co-host"] });
        _follows.Setup(f => f.GetFollowingIdsAsync("co-host", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u7"]);
        _follows.Setup(f => f.GetFollowingIdsAsync(HostId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u1"]);
        _users.Setup(u => u.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) => ids.Select(U).ToList());
        _participants.Setup(p => p.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _notifications.Setup(n => n.ListUserIdsByTypeAndEventAsync(UserNotificationType.EventInvitation, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HashSet<string>());

        var result = await _sut.HandleAsync("co-host", "evt1");

        Assert.Equal("u7", Assert.Single(result.Follows).UserId);
    }
}
