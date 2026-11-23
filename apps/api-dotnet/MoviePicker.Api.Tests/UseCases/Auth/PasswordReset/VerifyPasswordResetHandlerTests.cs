using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.PasswordReset;

public sealed class VerifyPasswordResetHandlerTests
{
    private const string PlainToken = "verify-token-plain";
    private static readonly DateTimeOffset IssuedAt = new(2026, 11, 23, 10, 0, 0, TimeSpan.Zero);

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPasswordResetTokenRepository> _tokens = new();

    private VerifyPasswordResetHandler CreateHandler() => new(_users.Object, _tokens.Object);

    private static PasswordResetToken StoredToken() => new()
    {
        Id = "tok-1",
        UserId = "user-1",
        TokenHash = PasswordResetTokenFactory.Hash(PlainToken),
        CreatedAt = IssuedAt,
        ExpiresAtUtc = IssuedAt.AddMinutes(30)
    };

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_EmptyToken_IsRefusedWithoutLookup(string token)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            CreateHandler().HandleAsync(new PasswordResetVerifyRequest { Token = token }));

        Assert.Equal(ErrorCodes.InvalidResetToken, ex.Reason);
        _tokens.Verify(x => x.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_UnknownExpiredOrConsumedToken_IsRefused()
    {
        _tokens
            .Setup(x => x.GetByTokenHashAsync(PasswordResetTokenFactory.Hash(PlainToken), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken?)null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            CreateHandler().HandleAsync(new PasswordResetVerifyRequest { Token = PlainToken }));

        Assert.Equal(ErrorCodes.InvalidResetToken, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TokenOfADeletedAccount_IsRefused()
    {
        _tokens
            .Setup(x => x.GetByTokenHashAsync(PasswordResetTokenFactory.Hash(PlainToken), It.IsAny<CancellationToken>()))
            .ReturnsAsync(StoredToken());
        _users.Setup(x => x.GetByIdAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            CreateHandler().HandleAsync(new PasswordResetVerifyRequest { Token = PlainToken }));

        Assert.Equal(ErrorCodes.InvalidResetToken, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_LiveToken_IsAcceptedWithoutBeingConsumed()
    {
        _tokens
            .Setup(x => x.GetByTokenHashAsync(PasswordResetTokenFactory.Hash(PlainToken), It.IsAny<CancellationToken>()))
            .ReturnsAsync(StoredToken());
        _users
            .Setup(x => x.GetByIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "user-1", Email = "neo@example.com", DisplayName = "Neo" });

        await CreateHandler().HandleAsync(new PasswordResetVerifyRequest { Token = $" {PlainToken} " });

        _tokens.Verify(
            x => x.MarkConsumedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _tokens.Verify(
            x => x.InvalidateActiveForUserAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
