using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.OAuth;

public sealed class OAuthLoginHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 12, 12, 10, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FakeTimeProvider(DateTimeOffset now) => _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
    }

    private static Mock<IOAuthProfilePhotoImporter> PassThroughImporter()
    {
        var importer = new Mock<IOAuthProfilePhotoImporter>();
        importer.Setup(i => i.ImportAsync(It.IsAny<User>(), It.IsAny<ExternalLoginInfo>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User user, ExternalLoginInfo _, string? _, CancellationToken _) => user);
        return importer;
    }

    private sealed class Fixture
    {
        public InMemoryUserRepository Users { get; } = new();
        public Mock<IOAuthProfilePhotoImporter> Importer { get; } = PassThroughImporter();
        public Mock<IAuthSessionInvalidator> Sessions { get; } = new();
        public InMemoryPushSubscriptionRepository Push { get; } = new();

        public OAuthLoginHandler CreateHandler() =>
            new(Users, Importer.Object, Sessions.Object, Push, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_NewAccount_ImportsTheProviderPhotoWithTheAccessToken()
    {
        var f = new Fixture();
        var withPhoto = new AvatarPhoto { Key = AvatarPhotoKeys.Sample, IsActive = true };
        f.Importer.Setup(i => i.ImportAsync(It.IsAny<User>(), It.IsAny<ExternalLoginInfo>(), "ya29.token", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User user, ExternalLoginInfo _, string? _, CancellationToken _) => user with { AvatarPhoto = withPhoto });

        var outcome = await f.CreateHandler().HandleAsync(
            new ExternalLoginInfo { Provider = "google", Subject = "sub-new", Email = "new@example.com", EmailVerified = true, DisplayName = "New" },
            "ya29.token");

        Assert.True(outcome.IsNewAccount);
        Assert.Equal(withPhoto, outcome.User!.AvatarPhoto);
    }

    [Fact]
    public async Task HandleAsync_KnownIdentity_DoesNotImportAPhoto()
    {
        var f = new Fixture();
        await f.Users.AddAsync(new User
        {
            Email = "known@example.com",
            Handle = "known",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "sub-known", Email = "known@example.com", LinkedAt = TestEpoch }]
        });

        await f.CreateHandler().HandleAsync(
            new ExternalLoginInfo { Provider = "google", Subject = "sub-known", Email = "known@example.com", EmailVerified = true },
            "ya29.token");

        f.Importer.Verify(
            i => i.ImportAsync(It.IsAny<User>(), It.IsAny<ExternalLoginInfo>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ExistingAccountLinkedByEmail_DoesNotImportAPhoto()
    {
        var f = new Fixture();
        await f.Users.AddAsync(new User { Email = "linked@example.com", Handle = "linked" });

        await f.CreateHandler().HandleAsync(
            new ExternalLoginInfo { Provider = "google", Subject = "sub-linked", Email = "linked@example.com", EmailVerified = true },
            "ya29.token");

        f.Importer.Verify(
            i => i.ImportAsync(It.IsAny<User>(), It.IsAny<ExternalLoginInfo>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
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
    public async Task HandleAsync_VerifiedEmailMatchesConfirmedPasswordAccount_RefusesToLinkAndDoesNotSignIn()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            EmailVerifiedAt = TestEpoch.AddDays(-9),
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

    private static User UnconfirmedPasswordAccountOfASquatter() => new()
    {
        Email = "neo@example.com",
        DisplayName = "Squatter",
        Handle = "squatter",
        PasswordHash = "squatter-hash",
        Identities = [new LinkedIdentity { Provider = "github", Subject = "gh-squatter", Email = "squatter@example.com", LinkedAt = TestEpoch.AddDays(-5) }],
        UnlinkedIdentities = [new UnlinkedIdentity { Provider = "google", Subject = "g-old", UnlinkedAt = TestEpoch.AddDays(-4) }],
        CreatedAt = TestEpoch.AddDays(-10),
        UpdatedAt = TestEpoch.AddDays(-10)
    };

    private static ExternalLoginInfo GoogleSignInOfTheAddressOwner() => new()
    {
        Provider = "google",
        Subject = "g-owner",
        Email = "neo@example.com",
        EmailVerified = true,
        DisplayName = "Neo"
    };

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesUnconfirmedPasswordAccount_SignsInTheAddressOwner()
    {
        var f = new Fixture();
        var occupied = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter());

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner());

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal(occupied.Id, outcome.User!.Id);
        Assert.False(outcome.IsNewAccount);
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesUnconfirmedPasswordAccount_TakesEveryAccessAwayFromTheOccupant()
    {
        var f = new Fixture();
        var occupied = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter());
        await f.Push.UpsertAsync(new PushSubscription { UserId = occupied.Id, Endpoint = "https://push.example/squatter" });

        await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner());

        var reloaded = await f.Users.GetByIdAsync(occupied.Id);
        Assert.Equal(string.Empty, reloaded!.PasswordHash);
        var identity = Assert.Single(reloaded.Identities);
        Assert.Equal(("google", "g-owner"), (identity.Provider, identity.Subject));
        Assert.Empty(reloaded.UnlinkedIdentities);
        Assert.Null(await f.Users.GetByIdentityAsync("github", "gh-squatter"));
        f.Sessions.Verify(s => s.InvalidateAllForUserAsync(occupied.Id, It.IsAny<CancellationToken>()), Times.Once);
        Assert.Empty(await f.Push.ListByUserIdAsync(occupied.Id));
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesUnconfirmedPasswordAccount_ConfirmsTheAddress()
    {
        var f = new Fixture();
        var occupied = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter());

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner());

        Assert.Equal(TestEpoch, outcome.User!.EmailVerifiedAt);
        Assert.Equal(TestEpoch, (await f.Users.GetByIdAsync(occupied.Id))!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_UnverifiedEmailMatchesUnconfirmedPasswordAccount_LeavesTheAccountAlone()
    {
        var f = new Fixture();
        var occupied = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter());

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner() with { EmailVerified = false });

        Assert.Equal(OAuthOutcomeKind.EmailNotVerified, outcome.Kind);
        var reloaded = await f.Users.GetByIdAsync(occupied.Id);
        Assert.Equal("squatter-hash", reloaded!.PasswordHash);
        Assert.Null(reloaded.EmailVerifiedAt);
        f.Sessions.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesConfirmedPasswordAccount_KeepsItsSessionsAndPassword()
    {
        var f = new Fixture();
        var confirmed = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter() with { EmailVerifiedAt = TestEpoch.AddDays(-9) });

        await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner());

        Assert.Equal("squatter-hash", (await f.Users.GetByIdAsync(confirmed.Id))!.PasswordHash);
        f.Sessions.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesPasswordAccountOpenedBeforeAddressesWereConfirmed_AsksForAManualLinkAndKeepsItsAccess()
    {
        var f = new Fixture();
        var older = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter() with
        {
            CreatedAt = OAuthLoginHandler.AddressConfirmationRequiredSince.AddDays(-30)
        });

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner());

        Assert.Equal(OAuthOutcomeKind.PasswordAccountRequiresManualLink, outcome.Kind);
        var reloaded = await f.Users.GetByIdAsync(older.Id);
        Assert.Equal("squatter-hash", reloaded!.PasswordHash);
        Assert.Null(reloaded.EmailVerifiedAt);
        f.Sessions.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_IdentityTheUnconfirmedPasswordAccountUnlinked_DoesNotTakeItOver()
    {
        var f = new Fixture();
        var occupied = await f.Users.AddAsync(UnconfirmedPasswordAccountOfASquatter());

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner() with { Subject = "g-old" });

        Assert.NotEqual(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal("squatter-hash", (await f.Users.GetByIdAsync(occupied.Id))!.PasswordHash);
        f.Sessions.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailNoExistingAccount_CreatesAConfirmedAccount()
    {
        var f = new Fixture();

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner());

        Assert.True(outcome.IsNewAccount);
        Assert.Equal(TestEpoch, outcome.User!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_KnownIdentityWithTheAccountAddress_ConfirmsAnUnconfirmedAccount()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            Handle = "neo",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-owner", Email = "neo@example.com", LinkedAt = TestEpoch.AddDays(-3) }]
        });

        var outcome = await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner() with { Email = "NEO@example.com" });

        Assert.Equal(TestEpoch, outcome.User!.EmailVerifiedAt);
        Assert.Equal(TestEpoch, (await f.Users.GetByIdAsync(user.Id))!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_KnownIdentityWithAnotherAddress_LeavesTheAccountUnconfirmed()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            Handle = "neo",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-owner", Email = "other@example.com", LinkedAt = TestEpoch.AddDays(-3) }]
        });

        await f.CreateHandler().HandleAsync(GoogleSignInOfTheAddressOwner() with { Email = "other@example.com" });

        Assert.Null((await f.Users.GetByIdAsync(user.Id))!.EmailVerifiedAt);
    }

    [Fact]
    public async Task HandleAsync_VerifiedEmailMatchesPasswordlessAccount_ConfirmsTheAddress()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(PasswordlessWithGoogleAndGitHub());

        await f.CreateHandler().HandleAsync(GitHubSignIn("gh-new"));

        Assert.Equal(TestEpoch, (await f.Users.GetByIdAsync(user.Id))!.EmailVerifiedAt);
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
            .HandleAsync(userId, provider, "session-1", recentlyAuthenticated: true);

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
    public async Task HandleAsync_ProviderNameLongerThanTheProfileAllows_IsCutToASaveableName()
    {
        var f = new Fixture();
        var longName = new string('a', 79) + "🎬" + new string('b', 30);

        var outcome = await f.CreateHandler().HandleAsync(new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "sub-long",
            Email = "long@example.com",
            EmailVerified = true,
            DisplayName = longName
        });

        var saved = outcome.User!.DisplayName;
        Assert.Null(AuthInputValidation.ValidateDisplayName(saved));
        Assert.Equal(new string('a', 79), saved);
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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, Mock.Of<IAuthSessionInvalidator>(), Mock.Of<IPushSubscriptionRepository>(), new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, Mock.Of<IAuthSessionInvalidator>(), Mock.Of<IPushSubscriptionRepository>(), new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, Mock.Of<IAuthSessionInvalidator>(), Mock.Of<IPushSubscriptionRepository>(), new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, Mock.Of<IAuthSessionInvalidator>(), Mock.Of<IPushSubscriptionRepository>(), new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, Mock.Of<IAuthSessionInvalidator>(), Mock.Of<IPushSubscriptionRepository>(), new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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
