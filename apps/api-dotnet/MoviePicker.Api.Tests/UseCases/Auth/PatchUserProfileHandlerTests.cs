using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class PatchUserProfileHandlerTests
{
    private static User User(string id = "u1") =>
        new()
        {
            Id = id,
            Email = "a@b.co",
            PasswordHash = "h",
            DisplayName = "Old",
            UiTheme = UiThemePreference.System,
            CreatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero)
        };

    [Fact]
    public async Task HandleAsync_UnknownUser_ThrowsNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("x", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var handler = new PatchUserProfileHandler(users.Object);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.HandleAsync("x", new PatchUserProfileRequest { DisplayName = "N" }));
    }

    [Fact]
    public async Task HandleAsync_NoFields_DoesNotCallUpdate()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        var handler = new PatchUserProfileHandler(users.Object);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest());

        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Equal("Old", res.DisplayName);
        Assert.Equal(UiThemePreference.System, res.UiTheme);
    }

    [Fact]
    public async Task HandleAsync_UpdatesDisplayName()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object);

        var res = await handler.HandleAsync(
            "u1",
            new PatchUserProfileRequest { DisplayName = "NewName" });

        Assert.Equal("NewName", res.DisplayName);
        users.Verify(
            x => x.UpdateAsync(
                It.Is<User>(y => y.DisplayName == "NewName" && y.PasswordHash == u.PasswordHash),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_InvalidDisplayName_ThrowsBadRequest()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        var handler = new PatchUserProfileHandler(users.Object);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync("u1", new PatchUserProfileRequest { DisplayName = "   " }));
    }

    [Fact]
    public async Task HandleAsync_UpdatesUiTheme()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { UiTheme = "light" });

        Assert.Equal(UiThemePreference.Light, res.UiTheme);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.UiTheme == UiThemePreference.Light), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
