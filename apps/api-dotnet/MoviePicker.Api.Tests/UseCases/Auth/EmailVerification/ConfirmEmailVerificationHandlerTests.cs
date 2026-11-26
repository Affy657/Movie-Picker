using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth.EmailVerification;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.EmailVerification;

public sealed class ConfirmEmailVerificationHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 11, 25, 9, 0, 0, TimeSpan.Zero);
    private const string PlainToken = "plain-confirmation-token";

    private sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class Fixture
    {
        public InMemoryUserRepository Users { get; } = new();
        public InMemoryEmailVerificationTokenRepository Tokens { get; } = new();

        public ConfirmEmailVerificationHandler CreateHandler(DateTimeOffset? now = null) =>
            new(Users, Tokens, new FakeTimeProvider(now ?? TestEpoch), NullLogger<ConfirmEmailVerificationHandler>.Instance);

        public async Task<User> SeedUnconfirmedAsync() =>
            await Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo", PasswordHash = "hash" });

        public Task<EmailVerificationToken> IssueAsync(string userId, string plain = PlainToken, DateTimeOffset? createdAt = null)
        {
            var issuedAt = createdAt ?? TestEpoch.AddHours(-1);
            return Tokens.AddAsync(new EmailVerificationToken
            {
                UserId = userId,
                TokenHash = PasswordResetTokenFactory.Hash(plain),
                CreatedAt = issuedAt,
                ExpiresAtUtc = issuedAt.Add(EmailVerificationMailer.TokenLifetime)
            });
        }
    }

    [Fact]
    public async Task HandleAsync_LiveToken_ConfirmsTheAddressOfItsAccount()
    {
        var f = new Fixture();
        var user = await f.SeedUnconfirmedAsync();
        await f.IssueAsync(user.Id);

        await f.CreateHandler().HandleAsync(new EmailVerificationConfirmRequest { Token = PlainToken });

        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Equal(TestEpoch, reloaded!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_LiveToken_ConsumesEveryLinkSentToTheAccount()
    {
        var f = new Fixture();
        var user = await f.SeedUnconfirmedAsync();
        await f.IssueAsync(user.Id);
        await f.IssueAsync(user.Id, "older-token", TestEpoch.AddHours(-2));

        await f.CreateHandler().HandleAsync(new EmailVerificationConfirmRequest { Token = PlainToken });

        var older = await f.Tokens.FindUnexpiredAsync(PasswordResetTokenFactory.Hash("older-token"), TestEpoch);
        Assert.Equal(TestEpoch, older!.ConsumedAt);
    }

    [Fact]
    public async Task HandleAsync_TokenOpenedTwice_StaysConfirmedWithoutError()
    {
        var f = new Fixture();
        var user = await f.SeedUnconfirmedAsync();
        await f.IssueAsync(user.Id);
        await f.CreateHandler().HandleAsync(new EmailVerificationConfirmRequest { Token = PlainToken });

        await f.CreateHandler(TestEpoch.AddMinutes(5)).HandleAsync(new EmailVerificationConfirmRequest { Token = PlainToken });

        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Equal(TestEpoch, reloaded!.EmailVerifiedAt);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("unknown-token")]
    public async Task HandleAsync_TokenNobodyWasSent_IsRefused(string token)
    {
        var f = new Fixture();
        var user = await f.SeedUnconfirmedAsync();
        await f.IssueAsync(user.Id);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            f.CreateHandler().HandleAsync(new EmailVerificationConfirmRequest { Token = token }));

        Assert.Equal(ErrorCodes.InvalidEmailVerificationToken, ex.Reason);
        Assert.Null((await f.Users.GetByIdAsync(user.Id))!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_ExpiredToken_IsRefused()
    {
        var f = new Fixture();
        var user = await f.SeedUnconfirmedAsync();
        await f.IssueAsync(user.Id);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            f.CreateHandler(TestEpoch.Add(EmailVerificationMailer.TokenLifetime))
                .HandleAsync(new EmailVerificationConfirmRequest { Token = PlainToken }));

        Assert.Equal(ErrorCodes.InvalidEmailVerificationToken, ex.Reason);
        Assert.Null((await f.Users.GetByIdAsync(user.Id))!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_AccountDeletedSinceTheEmail_IsRefused()
    {
        var f = new Fixture();
        await f.IssueAsync("gone-user");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            f.CreateHandler().HandleAsync(new EmailVerificationConfirmRequest { Token = PlainToken }));

        Assert.Equal(ErrorCodes.InvalidEmailVerificationToken, ex.Reason);
    }
}
