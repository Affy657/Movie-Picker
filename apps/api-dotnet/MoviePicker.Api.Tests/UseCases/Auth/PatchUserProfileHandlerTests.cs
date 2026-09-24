using System.Text.Json;
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
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.HandleAsync("x", new PatchUserProfileRequest { DisplayName = "N" }));
    }

    [Fact]
    public async Task HandleAsync_NoFields_DoesNotCallUpdate()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest());

        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Equal("Old", res.DisplayName);
        Assert.Equal(UiThemePreference.System, res.UiTheme);
        Assert.Equal(u.CreatedAt, res.CreatedAt);
    }

    [Fact]
    public async Task HandleAsync_AlwaysReturnsTheUnmaskedEmail()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync(
            "u1",
            new PatchUserProfileRequest { DisplayName = "NewName" });

        Assert.Equal("a@b.co", res.Email);
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
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

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
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

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
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { UiTheme = "light" });

        Assert.Equal(UiThemePreference.Light, res.UiTheme);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.UiTheme == UiThemePreference.Light), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UpdatesRatingScale()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { RatingScale = "ten" });

        Assert.Equal(RatingScale.Ten, res.RatingScale);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.RatingScale == RatingScale.Ten), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UpdatesHandle_WhenAvailable()
    {
        var u = User() with { Handle = "old_handle" };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users.Setup(x => x.GetByHandleAsync("new_handle", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { Handle = "NEW_HANDLE" });

        Assert.Equal("new_handle", res.Handle);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.Handle == "new_handle"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HandleTakenByOther_ThrowsConflict()
    {
        var u = User() with { Handle = "mine" };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.GetByHandleAsync("taken", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("u2") with { Handle = "taken" });
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        await Assert.ThrowsAsync<ConflictException>(() =>
            handler.HandleAsync("u1", new PatchUserProfileRequest { Handle = "taken" }));
    }

    [Fact]
    public async Task HandleAsync_InvalidHandle_ThrowsBadRequest()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync("u1", new PatchUserProfileRequest { Handle = "ab" }));
    }

    [Fact]
    public async Task HandleAsync_BioTooLong_ThrowsBadRequest()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync("u1", new PatchUserProfileRequest { Bio = new string('x', 141) }));
    }

    [Fact]
    public async Task HandleAsync_EmptyBio_ClearsBio()
    {
        var u = User() with { Bio = "previous" };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { Bio = "   " });

        Assert.Null(res.Bio);
    }

    [Fact]
    public async Task HandleAsync_TogglesProfileVisibility()
    {
        var u = User() with { IsProfilePublic = true };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { IsProfilePublic = false });

        Assert.False(res.IsProfilePublic);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => !y.IsProfilePublic), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_TogglesWatchlistVisibility()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { IsWatchlistPublic = false });

        Assert.False(res.IsWatchlistPublic);
        Assert.True(res.IsProfilePublic);
        users.Verify(
            x => x.UpdateAsync(
                It.Is<User>(y => !y.IsWatchlistPublic && y.IsProfilePublic),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UpdatesLetterboxdUsername()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { LetterboxdUsername = "  dave_v  " });

        Assert.Equal("dave_v", res.LetterboxdUsername);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.LetterboxdUsername == "dave_v"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_InvalidLetterboxdUsername_ThrowsBadRequest()
    {
        var u = User();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync("u1", new PatchUserProfileRequest { LetterboxdUsername = "dave/v" }));
        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_EmptyLetterboxdUsername_ClearsIt()
    {
        var u = User() with { LetterboxdUsername = "dave_v" };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(u);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        var handler = new PatchUserProfileHandler(users.Object, TimeProvider.System);

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { LetterboxdUsername = "" });

        Assert.Null(res.LetterboxdUsername);
    }

    private static User LinkedToLetterboxd() => User() with
    {
        Handle = "dave",
        Bio = "Cinéphile du dimanche",
        AvatarId = "fox",
        Identities = [new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "a@b.co" }],
        LetterboxdUsername = "dave_v",
        LetterboxdLastSyncAt = new DateTimeOffset(2024, 2, 1, 0, 0, 0, TimeSpan.Zero),
        LetterboxdLastSyncError = "letterboxd_sync_unavailable",
        LetterboxdPendingReconciliationCount = 4
    };

    private static (PatchUserProfileHandler Handler, Mock<IUserRepository> Users) HandlerFor(User user)
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User x, CancellationToken _) => x);
        return (new PatchUserProfileHandler(users.Object, TimeProvider.System), users);
    }

    [Fact]
    public async Task HandleAsync_AnswersTheSameProfileAsGetMe()
    {
        var user = LinkedToLetterboxd();
        var (handler, users) = HandlerFor(user);

        var patched = await handler.HandleAsync(user.Id, new PatchUserProfileRequest { DisplayName = user.DisplayName });
        var read = await new GetUserProfileHandler(users.Object).HandleAsync(user.Id);

        Assert.Equal(JsonSerializer.Serialize(read), JsonSerializer.Serialize(patched));
        Assert.Equal(4, patched.LetterboxdPendingReconciliationCount);
    }

    [Fact]
    public async Task HandleAsync_NothingToUpdate_StillAnswersThePendingReconciliationCount()
    {
        var (handler, _) = HandlerFor(LinkedToLetterboxd());

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest());

        Assert.Equal(4, res.LetterboxdPendingReconciliationCount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("someone_else")]
    public async Task HandleAsync_DisconnectingOrChangingLetterboxd_ResetsThePendingReconciliationCount(string requested)
    {
        var (handler, users) = HandlerFor(LinkedToLetterboxd());

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { LetterboxdUsername = requested });

        Assert.Equal(0, res.LetterboxdPendingReconciliationCount);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.LetterboxdPendingReconciliationCount == 0), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_SameLetterboxdAccountInAnotherCase_KeepsThePendingReconciliationCount()
    {
        var (handler, users) = HandlerFor(LinkedToLetterboxd());

        var res = await handler.HandleAsync("u1", new PatchUserProfileRequest { LetterboxdUsername = "DAVE_V" });

        Assert.Equal(4, res.LetterboxdPendingReconciliationCount);
        users.Verify(
            x => x.UpdateAsync(It.Is<User>(y => y.LetterboxdPendingReconciliationCount == 4), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
