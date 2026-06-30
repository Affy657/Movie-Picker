using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.InviteUser;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.InviteUser;

public sealed class InviteUserHandlerTests
{
    private const string HostId = "host";
    private const string TargetId = "target";

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly InviteUserHandler _sut;

    public InviteUserHandlerTests()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns(HostId);
        _sut = new InviteUserHandler(
            _events.Object, _participants.Object, _follows.Object, _users.Object,
            _notifications.Object, _currentUser.Object, TimeProvider.System);
    }

    private static Event Evt(DateTimeOffset? closedAt = null) =>
        new() { Id = "evt1", Slug = "soiree", Title = "Soirée", CreatorUserId = HostId, ClosedAt = closedAt };

    private void SetupEvent(Event evt) =>
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

    private static InviteUserRequest Request() => new() { TargetUserId = TargetId };

    [Fact]
    public async Task HandleAsync_Anonymous_Throws()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_FinishedEvent_Throws()
    {
        SetupEvent(Evt(closedAt: DateTimeOffset.UtcNow.AddDays(-1)));

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_NotCreator_Throws()
    {
        SetupEvent(new Event { Id = "evt1", CreatorUserId = "someone-else" });

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_NotFollowingTarget_Throws()
    {
        SetupEvent(Evt());
        _follows.Setup(f => f.IsFollowingAsync(HostId, TargetId, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_TargetAlreadyParticipant_Throws()
    {
        SetupEvent(Evt());
        _follows.Setup(f => f.IsFollowingAsync(HostId, TargetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _participants.Setup(p => p.FindByEventAndUserIdAsync("evt1", TargetId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = TargetId });

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_AlreadyInvited_Throws()
    {
        SetupEvent(Evt());
        _follows.Setup(f => f.IsFollowingAsync(HostId, TargetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _participants.Setup(p => p.FindByEventAndUserIdAsync("evt1", TargetId, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        _notifications.Setup(n => n.ExistsAsync(TargetId, UserNotificationType.EventInvitation, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request()));
    }

    [Fact]
    public async Task HandleAsync_Valid_SendsInvitationNotification()
    {
        SetupEvent(Evt());
        _follows.Setup(f => f.IsFollowingAsync(HostId, TargetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _participants.Setup(p => p.FindByEventAndUserIdAsync("evt1", TargetId, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        _notifications.Setup(n => n.ExistsAsync(TargetId, UserNotificationType.EventInvitation, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _users.Setup(u => u.GetByIdAsync(HostId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = HostId, Handle = "host", DisplayName = "Host" });

        var result = await _sut.HandleAsync("evt1", Request());

        Assert.Equal("Invitation envoyée.", result.Message);
        _notifications.Verify(n => n.AddAsync(
            It.Is<UserNotification>(x => x.UserId == TargetId && x.Type == UserNotificationType.EventInvitation && x.EventId == "evt1"),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
