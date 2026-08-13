using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Donations;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Donations;

public sealed class ProcessKofiWebhookHandlerTests
{
    private const string ConfiguredToken = "kofi-secret-token";
    private static readonly DateTimeOffset TestEpoch = new(2026, 8, 13, 12, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FakeTimeProvider(DateTimeOffset now) => _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
    }

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IKofiWebhookLogRepository> _log = new();

    private ProcessKofiWebhookHandler CreateSut(string? configuredToken = ConfiguredToken)
    {
        var opts = Options.Create(new MoviePickerOptions { KofiWebhookToken = configuredToken });
        return new ProcessKofiWebhookHandler(
            _users.Object,
            _log.Object,
            opts,
            new FakeTimeProvider(TestEpoch),
            NullLogger<ProcessKofiWebhookHandler>.Instance);
    }

    private void AcceptNewMessages() =>
        _log.Setup(r => r.TryRecordAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

    private static string Payload(
        string token = ConfiguredToken,
        string messageId = "msg-1",
        string type = "Donation",
        string? email = "donor@example.com") =>
        JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["verification_token"] = token,
            ["message_id"] = messageId,
            ["type"] = type,
            ["email"] = email
        });

    private static User SampleUser(string id = "user-1") =>
        new()
        {
            Id = id,
            Email = "donor@example.com",
            DisplayName = "Donor",
            CreatedAt = TestEpoch.AddYears(-1),
            UpdatedAt = TestEpoch.AddYears(-1)
        };

    [Fact]
    public async Task HandleAsync_TokenNotConfigured_ReturnsNotConfigured()
    {
        var outcome = await CreateSut(configuredToken: null).HandleAsync(Payload());

        Assert.Equal(KofiWebhookOutcome.NotConfigured, outcome);
        _log.VerifyNoOtherCalls();
        _users.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json at all")]
    [InlineData("{\"verification_token\":\"kofi-secret-token\"}")]
    public async Task HandleAsync_UnusablePayload_ReturnsInvalidPayload(string? rawData)
    {
        var outcome = await CreateSut().HandleAsync(rawData);

        Assert.Equal(KofiWebhookOutcome.InvalidPayload, outcome);
        _users.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_WrongToken_ReturnsInvalidTokenWithoutTouchingData()
    {
        var outcome = await CreateSut().HandleAsync(Payload(token: "forged-token"));

        Assert.Equal(KofiWebhookOutcome.InvalidToken, outcome);
        _log.VerifyNoOtherCalls();
        _users.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_MissingToken_ReturnsInvalidToken()
    {
        var outcome = await CreateSut().HandleAsync("{\"message_id\":\"msg-1\",\"type\":\"Donation\"}");

        Assert.Equal(KofiWebhookOutcome.InvalidToken, outcome);
        _users.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_ReplayedMessage_ReturnsAlreadyProcessed()
    {
        _log.Setup(r => r.TryRecordAsync("msg-1", TestEpoch, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var outcome = await CreateSut().HandleAsync(Payload());

        Assert.Equal(KofiWebhookOutcome.AlreadyProcessed, outcome);
        _users.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_ShopOrder_DoesNotGrantBadge()
    {
        AcceptNewMessages();

        var outcome = await CreateSut().HandleAsync(Payload(type: "Shop Order"));

        Assert.Equal(KofiWebhookOutcome.UnsupportedType, outcome);
        _users.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_NoDonorEmail_DoesNotGrantBadge()
    {
        AcceptNewMessages();

        var outcome = await CreateSut().HandleAsync(Payload(email: null));

        Assert.Equal(KofiWebhookOutcome.NoDonorEmail, outcome);
        _users.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_UnknownDonorEmail_ReturnsNoMatchingAccount()
    {
        AcceptNewMessages();
        _users.Setup(r => r.GetByEmailAsync("donor@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var outcome = await CreateSut().HandleAsync(Payload());

        Assert.Equal(KofiWebhookOutcome.NoMatchingAccount, outcome);
        _users.Verify(
            r => r.MarkSupporterAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData("Donation")]
    [InlineData("Subscription")]
    [InlineData("subscription")]
    public async Task HandleAsync_MatchingDonor_MarksSupporter(string type)
    {
        AcceptNewMessages();
        _users.Setup(r => r.GetByEmailAsync("donor@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleUser());
        _users.Setup(r => r.MarkSupporterAsync("user-1", TestEpoch, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var outcome = await CreateSut().HandleAsync(Payload(type: type));

        Assert.Equal(KofiWebhookOutcome.SupporterMarked, outcome);
        _users.Verify(r => r.MarkSupporterAsync("user-1", TestEpoch, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DonorAlreadySupporter_KeepsFirstDonationDate()
    {
        AcceptNewMessages();
        _users.Setup(r => r.GetByEmailAsync("donor@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleUser());
        _users.Setup(r => r.MarkSupporterAsync("user-1", TestEpoch, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var outcome = await CreateSut().HandleAsync(Payload());

        Assert.Equal(KofiWebhookOutcome.AlreadySupporter, outcome);
    }
}
