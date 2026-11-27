using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.SignInDevices;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;
using MsOptions = Microsoft.Extensions.Options.Options;

namespace MoviePicker.Api.Tests.UseCases.Auth.SignInDevices;

public sealed class SignInDeviceHandlerTests
{
    private const string ChromeOnWindows =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private const string SafariOnIphone =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

    private static readonly DateTimeOffset Now = new(2026, 11, 27, 12, 40, 0, TimeSpan.Zero);

    private readonly InMemoryUserRepository _users = new();
    private readonly InMemoryKnownDeviceRepository _devices = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly RecordingSharedQuota _quota = new();
    private readonly MovableClock _clock = new(Now);
    private readonly List<EmailMessage> _sent = [];

    public SignInDeviceHandlerTests()
    {
        _email
            .Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((message, _) => _sent.Add(message))
            .Returns(Task.CompletedTask);
    }

    private SignInDeviceHandler Handler() => new(
        _users,
        _devices,
        _email.Object,
        _quota,
        MsOptions.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://www.movie-picker.fr" }),
        _clock,
        NullLogger<SignInDeviceHandler>.Instance);

    private async Task<User> AccountAsync() => await _users.AddAsync(new User
    {
        Email = "lea@example.com",
        DisplayName = "Léa",
        Handle = "lea",
        CreatedAt = Now,
        UpdatedAt = Now
    });

    private static SignInDeviceRequest Request(
        string userId,
        string? presentedToken = null,
        string? userAgent = ChromeOnWindows,
        string? method = "email",
        CatalogLanguage language = CatalogLanguage.French) =>
        new(userId, presentedToken, userAgent, method, language);

    [Fact]
    public async Task FirstDeviceOfAnAccount_IsRememberedWithoutAnyEmail()
    {
        var user = await AccountAsync();

        var outcome = await Handler().HandleAsync(Request(user.Id));

        var device = Assert.Single(_devices.All);
        Assert.Equal(user.Id, device.UserId);
        Assert.Equal(SignInDeviceTokens.Hash(user.Id, outcome.Token), device.TokenHash);
        Assert.Equal("Chrome", device.Browser);
        Assert.Equal("Windows", device.OperatingSystem);
        Assert.Equal(Now, device.FirstSeenAt);
        Assert.Equal(device.Id, outcome.DeviceId);
        Assert.Empty(_sent);
    }

    [Fact]
    public async Task NewDeviceOnAnAccountThatAlreadyHasOne_SendsTheAlertToTheAccountAddress()
    {
        var user = await AccountAsync();
        await Handler().HandleAsync(Request(user.Id));

        await Handler().HandleAsync(Request(user.Id, userAgent: SafariOnIphone, method: "google"));

        Assert.Equal(2, _devices.All.Count);
        var message = Assert.Single(_sent);
        Assert.Equal("lea@example.com", message.ToEmail);
        Assert.Equal(NewSignInEmailFactory.Tag, message.Tag);
        Assert.Contains("Safari sur iOS", message.TextBody);
        Assert.Contains("Google", message.TextBody);
    }

    [Fact]
    public async Task KnownDevice_SendsNothingAndRefreshesItsLastSignIn()
    {
        var user = await AccountAsync();
        var first = await Handler().HandleAsync(Request(user.Id));
        await Handler().HandleAsync(Request(user.Id, userAgent: SafariOnIphone));
        _sent.Clear();
        _clock.Advance(TimeSpan.FromDays(3));

        var again = await Handler().HandleAsync(Request(user.Id, presentedToken: first.Token));

        Assert.Empty(_sent);
        Assert.Equal(first.Token, again.Token);
        Assert.Equal(first.DeviceId, again.DeviceId);
        Assert.Equal(Now.AddDays(3), _devices.All.Single(d => d.Id == first.DeviceId).LastSeenAt);
    }

    [Fact]
    public async Task DeviceKnownToAnotherAccount_IsNewForThisOne()
    {
        var lea = await AccountAsync();
        var tom = await _users.AddAsync(new User { Email = "tom@example.com", DisplayName = "Tom", Handle = "tom" });
        await Handler().HandleAsync(Request(tom.Id));
        var shared = await Handler().HandleAsync(Request(lea.Id));
        _sent.Clear();

        await Handler().HandleAsync(Request(tom.Id, presentedToken: shared.Token));

        Assert.Equal("tom@example.com", Assert.Single(_sent).ToEmail);
    }

    [Fact]
    public async Task SameBrowserOnTwoAccounts_LeavesNoCommonTraceBetweenThem()
    {
        var lea = await AccountAsync();
        var tom = await _users.AddAsync(new User { Email = "tom@example.com", DisplayName = "Tom", Handle = "tom" });
        var browser = await Handler().HandleAsync(Request(lea.Id));

        await Handler().HandleAsync(Request(tom.Id, presentedToken: browser.Token));

        Assert.Equal(2, _devices.All.Select(d => d.TokenHash).Distinct().Count());
    }

    [Fact]
    public async Task MalformedToken_IsReplacedByAFreshOne()
    {
        var user = await AccountAsync();

        var outcome = await Handler().HandleAsync(Request(user.Id, presentedToken: "not a device token"));

        Assert.NotEqual("not a device token", outcome.Token);
        Assert.True(SignInDeviceTokens.IsWellFormed(outcome.Token));
    }

    [Fact]
    public async Task DeviceForgottenAfterItsRetention_AlertsAgain()
    {
        var user = await AccountAsync();
        var first = await Handler().HandleAsync(Request(user.Id));
        _clock.Advance(KnownDevice.Retention - TimeSpan.FromDays(1));
        await Handler().HandleAsync(Request(user.Id, userAgent: SafariOnIphone));
        _sent.Clear();
        _clock.Advance(TimeSpan.FromDays(2));

        await Handler().HandleAsync(Request(user.Id, presentedToken: first.Token));

        Assert.Single(_sent);
    }

    [Fact]
    public async Task Alerts_AreCappedPerAccountAndPerDay()
    {
        var user = await AccountAsync();
        await Handler().HandleAsync(Request(user.Id));
        _quota.Allows = false;

        await Handler().HandleAsync(Request(user.Id, userAgent: SafariOnIphone));

        Assert.Empty(_sent);
        Assert.Equal(2, _devices.All.Count);
        var call = Assert.Single(_quota.Calls);
        Assert.Equal(SignInDeviceHandler.AlertQuotaScope, call.Scope);
        Assert.Equal(user.Id, call.Subject);
        Assert.Equal(SignInDeviceHandler.MaxAlertsPerAccountPerDay, call.Limit);
        Assert.Equal(TimeSpan.FromDays(1), call.Window);
    }

    [Fact]
    public async Task FailedEmail_DoesNotFailTheSignIn()
    {
        var user = await AccountAsync();
        await Handler().HandleAsync(Request(user.Id));
        _email
            .Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EmailDeliveryException("down", 503));

        var outcome = await Handler().HandleAsync(Request(user.Id, userAgent: SafariOnIphone));

        Assert.True(SignInDeviceTokens.IsWellFormed(outcome.Token));
        Assert.Equal(2, _devices.All.Count);
    }

    [Fact]
    public async Task EnglishBrowser_GetsTheEnglishAlert()
    {
        var user = await AccountAsync();
        await Handler().HandleAsync(Request(user.Id));

        await Handler().HandleAsync(Request(user.Id, userAgent: SafariOnIphone, language: CatalogLanguage.English));

        Assert.Contains("Safari on iOS", Assert.Single(_sent).TextBody);
    }

    [Fact]
    public async Task DeletedAccount_RemembersNothing()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => Handler().HandleAsync(Request("gone")));

        Assert.Empty(_devices.All);
    }
}
