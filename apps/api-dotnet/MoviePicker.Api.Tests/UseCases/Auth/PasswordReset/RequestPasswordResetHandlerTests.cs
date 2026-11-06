using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;
using MsOptions = Microsoft.Extensions.Options.Options;

namespace MoviePicker.Api.Tests.UseCases.Auth.PasswordReset;

public sealed class RequestPasswordResetHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 4, 29, 10, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private DateTimeOffset _now;
        private readonly long _timestamp = Stopwatch.GetTimestamp();

        public FakeTimeProvider(DateTimeOffset start) => _now = start;

        public List<TimeSpan> RequestedDelays { get; } = [];

        public override DateTimeOffset GetUtcNow() => _now;

        public override long GetTimestamp() => _timestamp;

        public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
        {
            RequestedDelays.Add(dueTime);
            callback(state);
            return new CompletedTimer();
        }

        public void Advance(TimeSpan delta) => _now = _now.Add(delta);

        private sealed class CompletedTimer : ITimer
        {
            public bool Change(TimeSpan dueTime, TimeSpan period) => false;
            public void Dispose() { }
            public ValueTask DisposeAsync() => ValueTask.CompletedTask;
        }
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message, Exception? Ex)> Entries { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception), exception));

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }

    private static User SampleUser(string id = "user-1", string email = "known@example.com") =>
        new()
        {
            Id = id,
            Email = email,
            DisplayName = "Neo",
            PasswordHash = "hash",
            UiTheme = UiThemePreference.System,
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        };

    private static IOptions<MoviePickerOptions> ConfigureOptions(string publicWebBaseUrl) =>
        MsOptions.Create(new MoviePickerOptions { PublicWebBaseUrl = publicWebBaseUrl });

    [Fact]
    public async Task HandleAsync_UnknownEmail_DoesNotCreateTokenAndDoesNotSendEmail()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("ghost@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var tokens = new Mock<IPasswordResetTokenRepository>();
        var emailSender = new Mock<IEmailSender>();
        var quota = new RecordingSharedQuota();
        var handler = new RequestPasswordResetHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            ConfigureOptions("https://www.movie-picker.fr"),
            quota,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "ghost@example.com" },
            clientIp: null,
            userAgent: null);

        tokens.Verify(x => x.GetMostRecentForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
        emailSender.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(quota.Calls);
    }

    [Fact]
    public async Task HandleAsync_UnknownEmail_TakesAtLeastTheResponseTimeFloor()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("ghost@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var handler = CreateHandler(
            users.Object,
            new Mock<IPasswordResetTokenRepository>().Object,
            new Mock<IEmailSender>().Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(new PasswordResetRequest { Email = "ghost@example.com" }, null, null);

        Assert.Equal([RequestPasswordResetHandler.ResponseTimeFloor], clock.RequestedDelays);
    }

    [Fact]
    public async Task HandleAsync_KnownEmail_WaitsForTheSameFloorAsAnUnknownOne()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleUser());
        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken?)null);
        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) => t with { Id = "tok" });
        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            new Mock<IEmailSender>().Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(new PasswordResetRequest { Email = "known@example.com" }, null, null);

        Assert.Equal([RequestPasswordResetHandler.ResponseTimeFloor], clock.RequestedDelays);
    }

    private static RequestPasswordResetHandler CreateHandler(
        IUserRepository users,
        IPasswordResetTokenRepository tokens,
        IEmailSender emailSender,
        TimeProvider clock,
        ILogger<RequestPasswordResetHandler> logger,
        string publicWebBaseUrl = "https://www.movie-picker.fr",
        ISharedQuota? quota = null) =>
        new(users, tokens, emailSender, ConfigureOptions(publicWebBaseUrl), quota ?? new RecordingSharedQuota(), clock, logger);

    private static (Mock<IUserRepository> Users, Mock<IPasswordResetTokenRepository> Tokens, Mock<IEmailSender> Sender) KnownAccount(User user)
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(user.Email, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync(user.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken?)null);
        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) => t with { Id = "tok" });
        return (users, tokens, new Mock<IEmailSender>());
    }

    [Fact]
    public async Task HandleAsync_DailyCapReached_SendsNothingButWaitsTheSameFloor()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var (users, tokens, sender) = KnownAccount(SampleUser());
        var quota = new RecordingSharedQuota { Allows = false };
        var handler = CreateHandler(
            users.Object, tokens.Object, sender.Object, clock, new CapturingLogger<RequestPasswordResetHandler>(), quota: quota);

        await handler.HandleAsync(new PasswordResetRequest { Email = "known@example.com" }, null, null);

        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
        sender.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Equal([RequestPasswordResetHandler.ResponseTimeFloor], clock.RequestedDelays);
    }

    [Fact]
    public async Task HandleAsync_CountsEveryEmailAgainstTheCapOfTheTargetAddress()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var (users, tokens, sender) = KnownAccount(SampleUser(email: "Known@Example.com"));
        var quota = new RecordingSharedQuota();
        var handler = CreateHandler(
            users.Object, tokens.Object, sender.Object, clock, new CapturingLogger<RequestPasswordResetHandler>(), quota: quota);

        await handler.HandleAsync(new PasswordResetRequest { Email = "Known@Example.com" }, null, null);

        var call = Assert.Single(quota.Calls);
        Assert.Equal(RequestPasswordResetHandler.EmailQuotaScope, call.Scope);
        Assert.Equal("known@example.com", call.Subject);
        Assert.Equal(RequestPasswordResetHandler.MaxEmailsPerAddressPerDay, call.Limit);
        Assert.Equal(TimeSpan.FromHours(24), call.Window);
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("en")]
    public async Task HandleAsync_NeverCopiesTheDisplayNameIntoTheEmail(string locale)
    {
        const string freeText = "Gagnez un iPhone sur evil.example";
        var clock = new FakeTimeProvider(TestEpoch);
        var (users, tokens, sender) = KnownAccount(SampleUser() with { DisplayName = freeText });
        EmailMessage? sent = null;
        sender
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((m, _) => sent = m)
            .Returns(Task.CompletedTask);
        var handler = CreateHandler(
            users.Object, tokens.Object, sender.Object, clock, new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(new PasswordResetRequest { Email = "known@example.com", Locale = locale }, null, null);

        Assert.NotNull(sent);
        Assert.DoesNotContain(freeText, sent!.HtmlBody);
        Assert.DoesNotContain(freeText, sent.TextBody);
        Assert.DoesNotContain(freeText, sent.Subject);
    }

    [Fact]
    public async Task HandleAsync_KnownEmail_NoRecentToken_CreatesTokenAndSendsEmail()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        PasswordResetToken? passedToAdd = null;
        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken?)null);
        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) =>
            {
                passedToAdd = t;
                return t with { Id = "new-token-id" };
            });

        EmailMessage? captured = null;
        var emailSender = new Mock<IEmailSender>();
        emailSender
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((m, _) => captured = m)
            .Returns(Task.CompletedTask);

        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "known@example.com", Locale = "fr" },
            clientIp: null,
            userAgent: null);

        Assert.NotNull(passedToAdd);
        Assert.Equal("user-1", passedToAdd!.UserId);
        Assert.False(string.IsNullOrEmpty(passedToAdd.TokenHash));
        Assert.Null(passedToAdd.ConsumedAt);
        Assert.Equal(TestEpoch.AddMinutes(30), passedToAdd.ExpiresAtUtc);
        Assert.Equal(TestEpoch, passedToAdd.CreatedAt);
        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(captured);
        Assert.Contains("<a href=", captured!.HtmlBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HandleAsync_KnownEmail_RecentActiveToken_DoesNotCreateOrSend()
    {
        var quota = new RecordingSharedQuota();
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var recent = new PasswordResetToken
        {
            Id = "old",
            UserId = user.Id,
            TokenHash = "hash",
            CreatedAt = TestEpoch - TimeSpan.FromSeconds(30),
            ExpiresAtUtc = TestEpoch.AddMinutes(20),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync(recent);

        var emailSender = new Mock<IEmailSender>();

        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>(),
            quota: quota);

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "known@example.com" },
            clientIp: null,
            userAgent: null);

        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
        emailSender.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(quota.Calls);
    }

    [Fact]
    public async Task HandleAsync_KnownEmail_RecentConsumedToken_CreatesNewToken()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var recentConsumed = new PasswordResetToken
        {
            Id = "used",
            UserId = user.Id,
            TokenHash = "hash",
            CreatedAt = TestEpoch - TimeSpan.FromSeconds(5),
            ExpiresAtUtc = TestEpoch.AddMinutes(25),
            ConsumedAt = TestEpoch - TimeSpan.FromSeconds(2)
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync(recentConsumed);

        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) => t with { Id = "replacement-id" });

        var emailSender = new Mock<IEmailSender>();
        emailSender.Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "known@example.com" },
            clientIp: null,
            userAgent: null);

        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Once);
        emailSender.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_KnownEmail_RecentTokenOlderThan60s_CreatesNewToken()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();

        var recentActiveOld = new PasswordResetToken
        {
            Id = "old-active",
            UserId = user.Id,
            TokenHash = "hash",
            CreatedAt = TestEpoch - TimeSpan.FromSeconds(61),
            ExpiresAtUtc = TestEpoch.AddMinutes(10),
            ConsumedAt = null
        };

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync(recentActiveOld);

        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) => t with { Id = "fresh-id" });

        var emailSender = new Mock<IEmailSender>();
        emailSender.Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "known@example.com" },
            clientIp: null,
            userAgent: null);

        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Once);
        emailSender.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_EmailSendFails_DoesNotPropagateException()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync((PasswordResetToken?)null);
        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) => t with { Id = "t1" });

        var emailSender = new Mock<IEmailSender>();
        emailSender
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EmailDeliveryException("oops", statusCode: 500));

        var logger = new CapturingLogger<RequestPasswordResetHandler>();

        var handler = CreateHandler(users.Object, tokens.Object, emailSender.Object, clock, logger);

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "known@example.com" },
            clientIp: null,
            userAgent: null);

        Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, logger.Entries[0].Level);
        Assert.Equal("oops", logger.Entries[0].Ex?.Message);
        Assert.Contains("email send failed", logger.Entries[0].Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task HandleAsync_BuildsResetUrlWithPublicWebBaseUrl()
    {
        const string baseUrl = "https://www.movie-picker.fr";
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();

        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(user.Email, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync((PasswordResetToken?)null);
        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) => t with { Id = "id" });

        EmailMessage? sent = null;
        var emailSender = new Mock<IEmailSender>();
        emailSender
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((m, _) => sent = m)
            .Returns(Task.CompletedTask);

        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>(),
            baseUrl);

        await handler.HandleAsync(
            new PasswordResetRequest { Email = user.Email },
            clientIp: null,
            userAgent: null);

        Assert.NotNull(sent);
        var expectedHrefPrefix = $"{baseUrl.TrimEnd('/')}/reset?token=";
        Assert.Contains($"href=\"{expectedHrefPrefix}", sent!.HtmlBody, StringComparison.Ordinal);
        Assert.Contains(expectedHrefPrefix, sent.TextBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HandleAsync_PassesIpAndUserAgentToTokenAddAsync()
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("known@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        PasswordResetToken? added = null;
        var tokens = new Mock<IPasswordResetTokenRepository>();
        tokens.Setup(x => x.GetMostRecentForUserAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync((PasswordResetToken?)null);
        tokens
            .Setup(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken t, CancellationToken _) =>
            {
                added = t;
                return t with { Id = "x" };
            });

        var emailSender = new Mock<IEmailSender>();
        emailSender.Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var handler = CreateHandler(users.Object, tokens.Object, emailSender.Object, clock, new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(
            new PasswordResetRequest { Email = "known@example.com" },
            clientIp: "203.0.113.42",
            userAgent: "TestAgent/1.0");

        Assert.NotNull(added);
        Assert.Equal("203.0.113.42", added!.RequestIp);
        Assert.Equal("TestAgent/1.0", added.RequestUserAgent);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\t  ")]
    public async Task HandleAsync_EmptyOrWhitespaceEmail_DoesNothing(string emailInput)
    {
        var clock = new FakeTimeProvider(TestEpoch);
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<IPasswordResetTokenRepository>();
        var emailSender = new Mock<IEmailSender>();

        var handler = CreateHandler(
            users.Object,
            tokens.Object,
            emailSender.Object,
            clock,
            new CapturingLogger<RequestPasswordResetHandler>());

        await handler.HandleAsync(
            new PasswordResetRequest { Email = emailInput },
            clientIp: null,
            userAgent: null);

        users.Verify(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        tokens.Verify(x => x.GetMostRecentForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        tokens.Verify(x => x.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
        emailSender.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
