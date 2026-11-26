using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.EmailVerification;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;
using MsOptions = Microsoft.Extensions.Options.Options;

namespace MoviePicker.Api.Tests.UseCases.Auth.EmailVerification;

public sealed class EmailVerificationMailerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 11, 25, 9, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _now = now;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan delta) => _now = _now.Add(delta);
    }

    private sealed class Fixture
    {
        public InMemoryEmailVerificationTokenRepository Tokens { get; } = new();
        public Mock<IEmailSender> Email { get; } = new();
        public RecordingSharedQuota Quota { get; } = new();
        public FakeTimeProvider Clock { get; } = new(TestEpoch);

        public EmailVerificationMailer CreateMailer() =>
            new(
                Tokens,
                Email.Object,
                MsOptions.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://www.movie-picker.fr/" }),
                Quota,
                Clock,
                NullLogger<EmailVerificationMailer>.Instance);

        public EmailMessage SingleSentMessage()
        {
            var invocation = Assert.Single(Email.Invocations);
            return Assert.IsType<EmailMessage>(invocation.Arguments[0]);
        }
    }

    private static User Unconfirmed(string id = "user-1") => new()
    {
        Id = id,
        Email = "Neo@Example.com",
        DisplayName = "Neo",
        PasswordHash = "hash",
        CreatedAt = TestEpoch,
        UpdatedAt = TestEpoch
    };

    private static string TokenOf(EmailMessage message)
    {
        const string marker = "/verify-email?token=";
        var start = message.TextBody.IndexOf(marker, StringComparison.Ordinal);
        Assert.True(start >= 0, "confirmation link missing from the text body");
        var rest = message.TextBody[(start + marker.Length)..];
        return Uri.UnescapeDataString(rest[..rest.IndexOfAny(['\r', '\n'])]);
    }

    [Fact]
    public async Task SendAsync_UnconfirmedAccount_SendsALinkWhoseTokenIsStoredOnlyAsItsHash()
    {
        var f = new Fixture();

        await f.CreateMailer().SendAsync(Unconfirmed(), "fr");

        var message = f.SingleSentMessage();
        Assert.Equal("Neo@Example.com", message.ToEmail);
        Assert.Equal(EmailVerificationEmailFactory.Tag, message.Tag);
        Assert.Contains("https://www.movie-picker.fr/verify-email?token=", message.HtmlBody);
        var plain = TokenOf(message);
        var stored = await f.Tokens.FindUnexpiredAsync(PasswordResetTokenFactory.Hash(plain), TestEpoch);
        Assert.NotNull(stored);
        Assert.Equal("user-1", stored.UserId);
        Assert.Equal(TestEpoch.Add(EmailVerificationMailer.TokenLifetime), stored.ExpiresAtUtc);
        Assert.Null(await f.Tokens.FindUnexpiredAsync(plain, TestEpoch));
    }

    [Fact]
    public async Task SendAsync_ConfirmedAccount_SendsNothing()
    {
        var f = new Fixture();

        await f.CreateMailer().SendAsync(Unconfirmed() with { EmailVerifiedAt = TestEpoch.AddDays(-1) }, "fr");

        Assert.Empty(f.Email.Invocations);
        Assert.Null(await f.Tokens.GetLatestForUserAsync("user-1"));
        Assert.Empty(f.Quota.Calls);
    }

    [Fact]
    public async Task SendAsync_AskedAgainWithinAMinute_SendsOnlyTheFirstEmail()
    {
        var f = new Fixture();
        var mailer = f.CreateMailer();

        await mailer.SendAsync(Unconfirmed(), "fr");
        f.Clock.Advance(TimeSpan.FromSeconds(30));
        await mailer.SendAsync(Unconfirmed(), "fr");

        Assert.Single(f.Email.Invocations);
    }

    [Fact]
    public async Task SendAsync_AskedAgainAfterAMinute_SendsASecondLinkAndKeepsTheFirstValid()
    {
        var f = new Fixture();
        var mailer = f.CreateMailer();

        await mailer.SendAsync(Unconfirmed(), "fr");
        var firstToken = TokenOf(f.SingleSentMessage());
        f.Clock.Advance(TimeSpan.FromMinutes(2));
        await mailer.SendAsync(Unconfirmed(), "fr");

        Assert.Equal(2, f.Email.Invocations.Count);
        Assert.NotNull(await f.Tokens.FindUnexpiredAsync(PasswordResetTokenFactory.Hash(firstToken), f.Clock.GetUtcNow()));
    }

    [Fact]
    public async Task SendAsync_DailyCapReached_SendsNothing()
    {
        var f = new Fixture();
        f.Quota.Allows = false;

        await f.CreateMailer().SendAsync(Unconfirmed(), "fr");

        Assert.Empty(f.Email.Invocations);
        var call = Assert.Single(f.Quota.Calls);
        Assert.Equal(EmailVerificationMailer.EmailQuotaScope, call.Scope);
        Assert.Equal("neo@example.com", call.Subject);
        Assert.Equal(EmailVerificationMailer.MaxEmailsPerAddressPerDay, call.Limit);
    }

    [Fact]
    public async Task SendAsync_EmailProviderFails_DoesNotThrow()
    {
        var f = new Fixture();
        f.Email.Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EmailDeliveryException("provider down", 503));

        await f.CreateMailer().SendAsync(Unconfirmed(), "fr");

        Assert.NotNull(await f.Tokens.GetLatestForUserAsync("user-1"));
    }

    [Fact]
    public async Task SendAsync_EnglishLocale_SendsTheEnglishEmail()
    {
        var f = new Fixture();

        await f.CreateMailer().SendAsync(Unconfirmed(), "en");

        Assert.Equal(EmailVerificationEmailFactory.Build("x@y.z", new Uri("https://a.b/"), "en").Subject, f.SingleSentMessage().Subject);
    }
}
