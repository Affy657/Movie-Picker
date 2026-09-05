using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class ChangePasswordHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 5, 15, 10, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FakeTimeProvider(DateTimeOffset now) => _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
    }

    private static User SampleUser(string id = "user-1") =>
        new()
        {
            Id = id,
            Email = "neo@example.com",
            DisplayName = "Neo",
            PasswordHash = "old-hash",
            UiTheme = UiThemePreference.System,
            AccentColor = AccentColor.Default,
            CreatedAt = TestEpoch.AddDays(-1),
            UpdatedAt = TestEpoch.AddDays(-1)
        };

    private static ChangePasswordHandler CreateHandler(
        IUserRepository users,
        IPasswordHasher hasher,
        IAuthSessionInvalidator sessions,
        TimeProvider clock) =>
        new(users, hasher, sessions, clock, NullLogger<ChangePasswordHandler>.Instance);

    [Fact]
    public async Task HandleAsync_UserNotFound_ThrowsNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.HandleAsync("missing", new ChangePasswordRequest
            {
                CurrentPassword = "abcd1234",
                NewPassword = "wxyz5678"
            }));

        sessions.Verify(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WrongCurrentPassword_ThrowsUnauthorized()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "wrong"))
            .Returns(PasswordVerification.Failed);

        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            handler.HandleAsync(user.Id, new ChangePasswordRequest
            {
                CurrentPassword = "wrong",
                NewPassword = "wxyz5678"
            }));

        Assert.Equal("Mot de passe actuel incorrect.", ex.Message);
        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        sessions.Verify(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NewPasswordTooShort_ThrowsBadRequest()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "abcd1234"))
            .Returns(PasswordVerification.Success);

        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(user.Id, new ChangePasswordRequest
            {
                CurrentPassword = "abcd1234",
                NewPassword = "abc1"
            }));

        Assert.Equal("Le mot de passe doit contenir au moins 8 caractères.", ex.Message);
        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        sessions.Verify(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NewPasswordWithoutDigit_ThrowsBadRequest()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "abcd1234"))
            .Returns(PasswordVerification.Success);

        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(user.Id, new ChangePasswordRequest
            {
                CurrentPassword = "abcd1234",
                NewPassword = "abcdefgh"
            }));

        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_HashesPassword_UpdatesUser_InvalidatesSessions()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        User? captured = null;
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => captured = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "abcd1234"))
            .Returns(PasswordVerification.Success);
        hasher.Setup(x => x.Hash("wxyz5678"))
            .Returns("new-hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3L);

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        await handler.HandleAsync(user.Id, new ChangePasswordRequest
        {
            CurrentPassword = "abcd1234",
            NewPassword = "wxyz5678"
        });

        Assert.NotNull(captured);
        Assert.Equal("new-hash", captured!.PasswordHash);
        Assert.Equal(TestEpoch, captured.UpdatedAt);
        Assert.Equal(user.Email, captured.Email);
        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NoExistingPassword_SetsPasswordWithoutVerifyingCurrent()
    {
        var user = SampleUser() with { PasswordHash = string.Empty };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        User? captured = null;
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => captured = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Hash("wxyz5678")).Returns("new-hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(1L);

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        await handler.HandleAsync(user.Id, new ChangePasswordRequest
        {
            CurrentPassword = null,
            NewPassword = "wxyz5678"
        });

        hasher.Verify(
            x => x.Verify(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
        Assert.Equal("new-hash", captured!.PasswordHash);
        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_VerifyReturnsSuccessRehashNeeded_StillAccepted()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "abcd1234"))
            .Returns(PasswordVerification.SuccessNeedsRehash);
        hasher.Setup(x => x.Hash("wxyz5678")).Returns("new-hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1L);

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        await handler.HandleAsync(user.Id, new ChangePasswordRequest
        {
            CurrentPassword = "abcd1234",
            NewPassword = "wxyz5678"
        });

        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
