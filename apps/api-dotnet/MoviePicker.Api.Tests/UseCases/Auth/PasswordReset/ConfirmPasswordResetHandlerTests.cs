using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.PasswordReset;

public sealed class ConfirmPasswordResetHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 4, 29, 10, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FakeTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private const string GenericTokenError = "Token invalide ou expiré.";
    private const string SuccessMessage = "Mot de passe réinitialisé. Connecte-toi avec ton nouveau mot de passe.";

    private static readonly string PlainToken = Base64UrlTestToken();
    private static readonly string[] expected = new[] { "update", "mark", "invalidateTokens", "invalidateSessions" };

    private static string Base64UrlTestToken()
    {
        Span<byte> b = stackalloc byte[24];
        for (var i = 0; i < b.Length; i++)
            b[i] = (byte)(i ^ 0x5a);
        return Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static User SampleUser(string id = "user-1", string email = "neo@example.com") =>
        new()
        {
            Id = id,
            Email = email,
            DisplayName = "Neo",
            PasswordHash = "old-hash",
            UiTheme = UiThemePreference.System,
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        };

    private static ConfirmPasswordResetHandler CreateHandler(
        IUserRepository users,
        IPasswordResetTokenRepository tokens,
        IPasswordHasher<User> hasher,
        IAuthSessionInvalidator sessions,
        TimeProvider clock) =>
        new(users, tokens, hasher, sessions, clock, NullLogger<ConfirmPasswordResetHandler>.Instance);

    [Fact]
    public async Task HandleAsync_EmptyToken_ThrowsBadRequest()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<IPasswordResetTokenRepository>();
        var hasher = new Mock<IPasswordHasher<User>>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new PasswordResetConfirmRequest { Token = "", NewPassword = "abcd1234" }));

        Assert.Equal(GenericTokenError, ex.Message);
        tokens.Verify(x => x.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_PasswordTooShort_ThrowsBadRequest()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<IPasswordResetTokenRepository>();
        var hasher = new Mock<IPasswordHasher<User>>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abc1" }));

        Assert.Equal("Le mot de passe doit contenir au moins 8 caractères.", ex.Message);
        tokens.Verify(x => x.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_PasswordWithoutLetter_ThrowsBadRequest()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<IPasswordResetTokenRepository>();
        var hasher = new Mock<IPasswordHasher<User>>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "12345678" }));

        Assert.Equal("Le mot de passe doit contenir au moins une lettre.", ex.Message);
        tokens.Verify(x => x.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_PasswordWithoutDigit_ThrowsBadRequest()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<IPasswordResetTokenRepository>();
        var hasher = new Mock<IPasswordHasher<User>>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcdefgh" }));

        Assert.Equal("Le mot de passe doit contenir au moins un chiffre.", ex.Message);
        tokens.Verify(x => x.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TokenNotFound_ThrowsBadRequest()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens
            .Setup(x => x.GetByTokenHashAsync(PasswordResetTokenFactory.Hash(PlainToken), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken?)null);
        var hasher = new Mock<IPasswordHasher<User>>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" }));

        Assert.Equal(GenericTokenError, ex.Message);
        users.Verify(x => x.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_UserGone_ThrowsBadRequest()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var hash = PasswordResetTokenFactory.Hash(PlainToken);
        var stored = new PasswordResetToken
        {
            Id = "tok-1",
            UserId = "user-1",
            TokenHash = hash,
            CreatedAt = TestEpoch,
            ExpiresAtUtc = TestEpoch.AddMinutes(30),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetByTokenHashAsync(hash, It.IsAny<CancellationToken>())).ReturnsAsync(stored);

        var hasher = new Mock<IPasswordHasher<User>>();
        var sessions = new Mock<IAuthSessionInvalidator>();

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" }));

        Assert.Equal(GenericTokenError, ex.Message);
        users.Verify(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_HappyPath_HashesNewPasswordAndUpdatesUser()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var hash = PasswordResetTokenFactory.Hash(PlainToken);
        var stored = new PasswordResetToken
        {
            Id = "tok-1",
            UserId = user.Id,
            TokenHash = hash,
            CreatedAt = TestEpoch,
            ExpiresAtUtc = TestEpoch.AddMinutes(30),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        User? capturedUpdate = null;
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                capturedUpdate = u;
                return u;
            });

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetByTokenHashAsync(hash, It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        tokens.Setup(x => x.MarkConsumedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        tokens.Setup(x => x.InvalidateActiveForUserAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<User>>();
        hasher.Setup(x => x.HashPassword(It.IsAny<User>(), "abcd1234")).Returns("NEW_HASH_FROM_HASHER");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(2L);

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        await handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" });

        hasher.Verify(x => x.HashPassword(It.Is<User>(u => u.Id == user.Id), "abcd1234"), Times.Once);
        Assert.NotNull(capturedUpdate);
        Assert.Equal("NEW_HASH_FROM_HASHER", capturedUpdate!.PasswordHash);
        Assert.Equal(TestEpoch, capturedUpdate.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_HappyPath_MarksTokenConsumedAndInvalidatesOtherTokens()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var hash = PasswordResetTokenFactory.Hash(PlainToken);
        var stored = new PasswordResetToken
        {
            Id = "tok-1",
            UserId = user.Id,
            TokenHash = hash,
            CreatedAt = TestEpoch,
            ExpiresAtUtc = TestEpoch.AddMinutes(30),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).ReturnsAsync((User u, CancellationToken _) => u);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetByTokenHashAsync(hash, It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        tokens.Setup(x => x.MarkConsumedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        tokens.Setup(x => x.InvalidateActiveForUserAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<User>>();
        hasher.Setup(x => x.HashPassword(It.IsAny<User>(), It.IsAny<string>())).Returns("hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0L);

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        await handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" });

        tokens.Verify(x => x.MarkConsumedAsync("tok-1", TestEpoch, It.IsAny<CancellationToken>()), Times.Once);
        tokens.Verify(x => x.InvalidateActiveForUserAsync(user.Id, TestEpoch, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HappyPath_CallsUpdateThenMarkThenInvalidateThenSessions()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var hash = PasswordResetTokenFactory.Hash(PlainToken);
        var stored = new PasswordResetToken
        {
            Id = "tok-1",
            UserId = user.Id,
            TokenHash = hash,
            CreatedAt = TestEpoch,
            ExpiresAtUtc = TestEpoch.AddMinutes(30),
            ConsumedAt = null
        };

        var callOrder = new List<string>();

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users
            .Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback(() => callOrder.Add("update"))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetByTokenHashAsync(hash, It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        tokens
            .Setup(x => x.MarkConsumedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback(() => callOrder.Add("mark"))
            .Returns(Task.CompletedTask);
        tokens
            .Setup(x => x.InvalidateActiveForUserAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback(() => callOrder.Add("invalidateTokens"))
            .Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<User>>();
        hasher.Setup(x => x.HashPassword(It.IsAny<User>(), It.IsAny<string>())).Returns("hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions
            .Setup(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback(() => callOrder.Add("invalidateSessions"))
            .ReturnsAsync(1L);

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        await handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" });

        Assert.Equal(expected, callOrder);
    }

    [Fact]
    public async Task HandleAsync_HappyPath_InvalidatesAuthSessions()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var hash = PasswordResetTokenFactory.Hash(PlainToken);
        var stored = new PasswordResetToken
        {
            Id = "tok-1",
            UserId = user.Id,
            TokenHash = hash,
            CreatedAt = TestEpoch,
            ExpiresAtUtc = TestEpoch.AddMinutes(30),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).ReturnsAsync((User u, CancellationToken _) => u);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetByTokenHashAsync(hash, It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        tokens.Setup(x => x.MarkConsumedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        tokens.Setup(x => x.InvalidateActiveForUserAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<User>>();
        hasher.Setup(x => x.HashPassword(It.IsAny<User>(), It.IsAny<string>())).Returns("hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(4L);

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        await handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" });

        sessions.Verify(x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HappyPath_ReturnsLocalizedSuccessMessage()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var hash = PasswordResetTokenFactory.Hash(PlainToken);
        var stored = new PasswordResetToken
        {
            Id = "tok-1",
            UserId = user.Id,
            TokenHash = hash,
            CreatedAt = TestEpoch,
            ExpiresAtUtc = TestEpoch.AddMinutes(30),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).ReturnsAsync((User u, CancellationToken _) => u);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetByTokenHashAsync(hash, It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        tokens.Setup(x => x.MarkConsumedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        tokens.Setup(x => x.InvalidateActiveForUserAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<User>>();
        hasher.Setup(x => x.HashPassword(It.IsAny<User>(), It.IsAny<string>())).Returns("hash");

        var sessions = new Mock<IAuthSessionInvalidator>();
        sessions.Setup(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0L);

        var handler = CreateHandler(users.Object, tokens.Object, hasher.Object, sessions.Object, clock);

        var res = await handler.HandleAsync(new PasswordResetConfirmRequest { Token = PlainToken, NewPassword = "abcd1234" });

        Assert.False(string.IsNullOrWhiteSpace(res.Message));
        Assert.Equal(SuccessMessage, res.Message);
    }
}
