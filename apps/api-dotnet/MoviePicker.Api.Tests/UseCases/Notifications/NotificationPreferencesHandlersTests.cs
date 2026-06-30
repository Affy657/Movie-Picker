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
    public async Task HandleAsync_ReturnsAllFlags()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1", NotifyOnMovieAdded = false, NotifyOnNewFollower = true });

        var result = await _sut.HandleAsync("u1");

        Assert.False(result.NotifyOnMovieAdded);
        Assert.True(result.NotifyOnNewFollower);
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
    public async Task HandleAsync_OnlyPatchesProvidedFields()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1", NotifyOnMovieAdded = true, NotifyOnNewFollower = true });
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var result = await _sut.HandleAsync("u1", new PatchNotificationPreferencesRequest { NotifyOnMovieAdded = false });

        Assert.False(result.NotifyOnMovieAdded);
        Assert.True(result.NotifyOnNewFollower);
        _users.Verify(u => u.UpdateAsync(
            It.Is<User>(x => !x.NotifyOnMovieAdded && x.NotifyOnNewFollower),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
