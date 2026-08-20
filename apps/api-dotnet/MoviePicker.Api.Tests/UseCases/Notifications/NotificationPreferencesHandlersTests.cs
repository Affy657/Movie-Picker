using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class GetNotificationPreferencesHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly GetNotificationPreferencesHandler _sut;

    public GetNotificationPreferencesHandlerTests()
    {
        _sut = new GetNotificationPreferencesHandler(_users.Object);
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("u1"));
    }

    [Fact]
    public async Task HandleAsync_ReturnsAllTypes()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = "u1",
                NotificationPreferences = new Dictionary<UserNotificationType, bool>
                {
                    [UserNotificationType.MovieAdded] = false,
                    [UserNotificationType.NewFollower] = true
                }
            });

        var result = await _sut.HandleAsync("u1");

        Assert.Equal(Enum.GetValues<UserNotificationType>().Length, result.Preferences.Count);
        Assert.False(result.Preferences.Single(p => p.Type == "movieadded").Enabled);
        Assert.True(result.Preferences.Single(p => p.Type == "newfollower").Enabled);
    }
}

public sealed class PatchNotificationPreferencesHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly PatchNotificationPreferencesHandler _sut;

    public PatchNotificationPreferencesHandlerTests()
    {
        _sut = new PatchNotificationPreferencesHandler(_users.Object, TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("u1", new PatchNotificationPreferencesRequest()));
    }

    [Fact]
    public async Task HandleAsync_UnknownType_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(
            "u1",
            new PatchNotificationPreferencesRequest
            {
                Preferences = [new NotificationTypePreferencePatch { Type = "not-a-type", Enabled = true }]
            }));
    }

    [Fact]
    public async Task HandleAsync_OnlyPatchesProvidedFields()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = "u1",
                NotificationPreferences = new Dictionary<UserNotificationType, bool>
                {
                    [UserNotificationType.MovieAdded] = true,
                    [UserNotificationType.NewFollower] = true
                }
            });
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var result = await _sut.HandleAsync(
            "u1",
            new PatchNotificationPreferencesRequest
            {
                Preferences = [new NotificationTypePreferencePatch { Type = "movieadded", Enabled = false }]
            });

        Assert.False(result.Preferences.Single(p => p.Type == "movieadded").Enabled);
        Assert.True(result.Preferences.Single(p => p.Type == "newfollower").Enabled);
        _users.Verify(u => u.UpdateAsync(
            It.Is<User>(x => !x.NotifiesOn(UserNotificationType.MovieAdded) && x.NotifiesOn(UserNotificationType.NewFollower)),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
