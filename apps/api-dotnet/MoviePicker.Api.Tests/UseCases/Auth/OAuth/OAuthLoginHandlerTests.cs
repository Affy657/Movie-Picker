using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.OAuth;

public sealed class OAuthLoginHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 8, 12, 10, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FakeTimeProvider(DateTimeOffset now) => _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
    }

    private sealed class Fixture
    {
        public InMemoryUserRepository Users { get; } = new();

        public OAuthLoginHandler CreateHandler() =>
            new(Users, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_KnownIdentity_SignsInExistingUser()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "sub-1", Email = "neo@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-1",
            Email = "neo@example.com",
            EmailVerified = true,
            DisplayName = "Neo"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal(user.Id, outcome.User!.Id);
        Assert.False(outcome.IsNewAccount);
    }

    [Fact]
    public async Task HandleAsync_UnverifiedEmail_ReturnsEmailNotVerified()
    {
        var f = new Fixture();

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "github",
            Subject = "sub-2",
            Email = "trinity@example.com",
            EmailVerified = false,
            DisplayName = "Trinity"
        });

        Assert.Equal(OAuthOutcomeKind.EmailNotVerified, outcome.Kind);
        Assert.Null(outcome.User);
        Assert.Empty(await f.Users.ListMissingHandleAsync());
    }

    [Fact]
    public async Task HandleAsync_MissingEmail_ReturnsEmailNotVerified()
    {
        var f = new Fixture();

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "github",
            Subject = "sub-3",
            Email = null,
            EmailVerified = true,
            DisplayName = "Morpheus"
        });

        Assert.Equal(OAuthOutcomeKind.EmailNotVerified, outcome.Kind);
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesPasswordAccount_RefusesToLinkAndDoesNotSignIn()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "existing-hash",
            CreatedAt = TestEpoch.AddDays(-10),
            UpdatedAt = TestEpoch.AddDays(-10)
        });

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-4",
            Email = "neo@example.com",
            EmailVerified = true,
            DisplayName = "Neo Anderson"
        });

        Assert.Equal(OAuthOutcomeKind.PasswordAccountRequiresManualLink, outcome.Kind);
        Assert.Null(outcome.User);
        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Empty(reloaded!.Identities);
        Assert.Equal("existing-hash", reloaded.PasswordHash);
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesPasswordlessAccount_AutoLinksAndSignsIn()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = string.Empty,
            Identities = [new LinkedIdentity { Provider = "github", Subject = "gh-1", Email = "neo@example.com", LinkedAt = TestEpoch.AddDays(-10) }],
            CreatedAt = TestEpoch.AddDays(-10),
            UpdatedAt = TestEpoch.AddDays(-10)
        });

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-4",
            Email = "neo@example.com",
            EmailVerified = true,
            DisplayName = "Neo Anderson"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal(user.Id, outcome.User!.Id);
        Assert.False(outcome.IsNewAccount);
        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Equal(2, reloaded!.Identities.Count);
        Assert.Contains(reloaded.Identities, i => i.Provider == "google" && i.Subject == "sub-4");
    }

    private static User PasswordlessWithGoogleAndGitHub() => new()
    {
        Email = "neo@example.com",
        DisplayName = "Neo",
        Handle = "neo",
        PasswordHash = string.Empty,
        Identities =
        [
            new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "neo@example.com", LinkedAt = TestEpoch.AddDays(-10) },
            new LinkedIdentity { Provider = "github", Subject = "gh-1", Email = "neo@example.com", LinkedAt = TestEpoch.AddDays(-10) }
        ],
        CreatedAt = TestEpoch.AddDays(-10),
        UpdatedAt = TestEpoch.AddDays(-10)
    };

    private static Task UnlinkAsync(Fixture f, string userId, string provider) =>
        new OAuthUnlinkHandler(
                f.Users,
                new Mock<IAuthSessionInvalidator>().Object,
                new FakeTimeProvider(TestEpoch.AddDays(-1)),
                NullLogger<OAuthUnlinkHandler>.Instance)
            .HandleAsync(userId, provider, "session-1");

    private static ExternalLoginInfo GitHubSignIn(string subject) => new()
    {
        Provider = "github",
        Subject = subject,
        Email = "neo@example.com",
        EmailVerified = true,
        DisplayName = "Neo"
    };

    [Fact]
    public async Task HandleAsync_IdentityTheUserUnlinked_IsNotLinkedBackBySigningInWithIt()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(PasswordlessWithGoogleAndGitHub());
        await UnlinkAsync(f, user.Id, "github");

        var outcome = await f.CreateHandler().HandleAsync(GitHubSignIn("gh-1"));

        Assert.NotEqual(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Null(outcome.User);
        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.DoesNotContain(reloaded!.Identities, i => i.Provider == "github");
    }

    [Fact]
    public async Task HandleAsync_IdentityTheUserUnlinked_AsksForAManualLink()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(PasswordlessWithGoogleAndGitHub());
        await UnlinkAsync(f, user.Id, "github");

        var outcome = await f.CreateHandler().HandleAsync(GitHubSignIn("gh-1"));

        Assert.Equal(OAuthOutcomeKind.UnlinkedIdentityRequiresManualLink, outcome.Kind);
    }

    [Fact]
    public async Task HandleAsync_AnotherAccountOfAnUnlinkedProvider_IsStillLinkedByItsVerifiedEmail()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(PasswordlessWithGoogleAndGitHub());
        await UnlinkAsync(f, user.Id, "github");

        var outcome = await f.CreateHandler().HandleAsync(GitHubSignIn("gh-2"));

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal(user.Id, outcome.User!.Id);
        Assert.Contains(outcome.User.Identities, i => i.Provider == "github" && i.Subject == "gh-2");
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailNoExistingAccount_CreatesAccountWithoutPassword()
    {
        var f = new Fixture();

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-5",
            Email = "smith@example.com",
            EmailVerified = true,
            DisplayName = "Agent Smith"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.True(outcome.IsNewAccount);
        var created = outcome.User!;
        Assert.Equal("smith@example.com", created.Email);
        Assert.Equal(string.Empty, created.PasswordHash);
        Assert.NotEmpty(created.Handle);
        Assert.True(created.IsProfilePublic);
        Assert.Single(created.Identities);
        Assert.Equal("google", created.Identities[0].Provider);
    }

    [Fact]
    public async Task HandleAsync_RaceOnAutoLinkToExistingAccount_ResolvesToRaceWinner()
    {
        var winner = new User { Id = "u-winner", Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" };
        var byEmail = new User { Id = "u-winner", Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" };
        var users = new Mock<IUserRepository>();
        users.SetupSequence(x => x.GetByIdentityAsync("google", "sub-race", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null)
            .ReturnsAsync(winner);
        users.Setup(x => x.GetByEmailAsync("neo@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(byEmail);
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.IdentityConflict());

        var handler = new OAuthLoginHandler(users.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

        var outcome = await handler.HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-race",
            Email = "neo@example.com",
            EmailVerified = true,
            DisplayName = "Neo"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal("u-winner", outcome.User!.Id);
    }

    [Fact]
    public async Task HandleAsync_RaceOnAutoLinkLostOnTheAccountVersion_SignsInTheRaceWinner()
    {
        var winner = new User { Id = "u-winner", Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" };
        var users = new Mock<IUserRepository>();
        users.SetupSequence(x => x.GetByIdentityAsync("google", "sub-race", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null)
            .ReturnsAsync(winner);
        users.Setup(x => x.GetByEmailAsync("neo@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u-winner", Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        users.Setup(x => x.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.ConcurrentUpdate());

        var handler = new OAuthLoginHandler(users.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

        var outcome = await handler.HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-race",
            Email = "neo@example.com",
            EmailVerified = true,
            DisplayName = "Neo"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal("u-winner", outcome.User!.Id);
    }

    [Fact]
    public async Task HandleAsync_RaceOnAccountCreationLostOnTheEmailIndex_SignsInTheRaceWinner()
    {
        var winner = new User { Id = "u-winner", Email = "smith@example.com", DisplayName = "Agent Smith", Handle = "agentsmith" };
        var users = new Mock<IUserRepository>();
        users.SetupSequence(x => x.GetByIdentityAsync("google", "sub-race", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null)
            .ReturnsAsync(winner);
        users.Setup(x => x.GetByEmailAsync("smith@example.com", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.EmailTaken());

        var handler = new OAuthLoginHandler(users.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

        var outcome = await handler.HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-race",
            Email = "smith@example.com",
            EmailVerified = true,
            DisplayName = "Agent Smith"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal("u-winner", outcome.User!.Id);
        Assert.False(outcome.IsNewAccount);
    }

    [Fact]
    public async Task HandleAsync_EmailTakenByAnotherAccountMeanwhile_FailsWithABusinessError()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdentityAsync("google", "sub-late", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByEmailAsync("late@example.com", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.EmailTaken());

        var handler = new OAuthLoginHandler(users.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => handler.HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-late",
            Email = "late@example.com",
            EmailVerified = true,
            DisplayName = "Late"
        }));

        Assert.Equal(ErrorCodes.OAuthLinkFailed, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_RaceOnAccountCreation_ResolvesToRaceWinner()
    {
        var winner = new User { Id = "u-winner", Email = "smith@example.com", DisplayName = "Agent Smith", Handle = "agentsmith" };
        var users = new Mock<IUserRepository>();
        users.SetupSequence(x => x.GetByIdentityAsync("google", "sub-race", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null)
            .ReturnsAsync(winner);
        users.Setup(x => x.GetByEmailAsync("smith@example.com", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.IdentityConflict());

        var handler = new OAuthLoginHandler(users.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

        var outcome = await handler.HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-race",
            Email = "smith@example.com",
            EmailVerified = true,
            DisplayName = "Agent Smith"
        });

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal("u-winner", outcome.User!.Id);
        Assert.False(outcome.IsNewAccount);
    }
}
