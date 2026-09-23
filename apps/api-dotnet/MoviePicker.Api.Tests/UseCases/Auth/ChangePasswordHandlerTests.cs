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
        TimeProvider clock,
        IPushSubscriptionRepository? pushSubscriptions = null) =>
        new(
            users,
            hasher,
            sessions,
            pushSubscriptions ?? new Mock<IPushSubscriptionRepository>().Object,
            clock,
            NullLogger<ChangePasswordHandler>.Instance);

    private static ChangePasswordRequest Change(string? currentPassword, string newPassword) =>
        new() { CurrentPassword = currentPassword, NewPassword = newPassword };

    [Fact]
    public async Task HandleAsync_Success_RevokesThePushSubscriptionsWithTheSessions()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "abcd1234")).Returns(PasswordVerification.Success);
        hasher.Setup(x => x.Hash("wxyz5678")).Returns("new-hash");
        var pushSubscriptions = new Mock<IPushSubscriptionRepository>();

        var handler = CreateHandler(
            users.Object,
            hasher.Object,
            new Mock<IAuthSessionInvalidator>().Object,
            new FakeTimeProvider(TestEpoch),
            pushSubscriptions.Object);

        await handler.HandleAsync(user.Id, Change("abcd1234", "wxyz5678"), recentlyAuthenticated: false);

        pushSubscriptions.Verify(x => x.DeleteByUserIdAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_PushRevocationFails_TheNewPasswordStillHolds()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "abcd1234")).Returns(PasswordVerification.Success);
        hasher.Setup(x => x.Hash("wxyz5678")).Returns("new-hash");
        var sessions = new Mock<IAuthSessionInvalidator>();
        var pushSubscriptions = new Mock<IPushSubscriptionRepository>();
        pushSubscriptions.Setup(x => x.DeleteByUserIdAsync(user.Id, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("store unavailable"));

        var handler = CreateHandler(
            users.Object,
            hasher.Object,
            sessions.Object,
            new FakeTimeProvider(TestEpoch),
            pushSubscriptions.Object);

        await handler.HandleAsync(user.Id, Change("abcd1234", "wxyz5678"), recentlyAuthenticated: false);

        users.Verify(x => x.UpdateAsync(It.Is<User>(u => u.PasswordHash == "new-hash"), It.IsAny<CancellationToken>()), Times.Once);
        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WrongCurrentPassword_KeepsThePushSubscriptions()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Verify("old-hash", "wrong")).Returns(PasswordVerification.Failed);
        var pushSubscriptions = new Mock<IPushSubscriptionRepository>();

        var handler = CreateHandler(
            users.Object,
            hasher.Object,
            new Mock<IAuthSessionInvalidator>().Object,
            new FakeTimeProvider(TestEpoch),
            pushSubscriptions.Object);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => handler.HandleAsync(user.Id, Change("wrong", "wxyz5678"), recentlyAuthenticated: true));

        Assert.Equal(ErrorCodes.CurrentPasswordIncorrect, ex.Reason);
        pushSubscriptions.Verify(x => x.DeleteByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_ThrowsNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, hasher.Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        await Assert.ThrowsAsync<NotFoundException>(
            () => handler.HandleAsync("missing", Change("abcd1234", "wxyz5678"), recentlyAuthenticated: true));

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

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => handler.HandleAsync(user.Id, Change("wrong", "wxyz5678"), recentlyAuthenticated: false));

        Assert.Equal(ErrorCodes.CurrentPasswordIncorrect, ex.Reason);
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

        var ex = await Assert.ThrowsAsync<BadRequestException>(
            () => handler.HandleAsync(user.Id, Change("abcd1234", "abc1"), recentlyAuthenticated: false));

        Assert.Equal(ErrorCodes.PasswordTooShort, ex.Reason);
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

        await Assert.ThrowsAsync<BadRequestException>(
            () => handler.HandleAsync(user.Id, Change("abcd1234", "abcdefgh"), recentlyAuthenticated: false));

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

        await handler.HandleAsync(user.Id, Change("abcd1234", "wxyz5678"), recentlyAuthenticated: false);

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

        await handler.HandleAsync(user.Id, Change(null, "wxyz5678"), recentlyAuthenticated: true);

        hasher.Verify(
            x => x.Verify(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
        Assert.Equal("new-hash", captured!.PasswordHash);
        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NoExistingPasswordOnAStaleSession_RequiresAFreshSignIn()
    {
        var user = SampleUser() with { PasswordHash = string.Empty };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, new Mock<IPasswordHasher>().Object, sessions.Object, new FakeTimeProvider(TestEpoch));

        var ex = await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.HandleAsync(user.Id, Change(null, "wxyz5678"), recentlyAuthenticated: false));

        Assert.Equal(ErrorCodes.ReauthenticationRequired, ex.Reason);
        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        sessions.Verify(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
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

        await handler.HandleAsync(user.Id, Change("abcd1234", "wxyz5678"), recentlyAuthenticated: false);

        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
