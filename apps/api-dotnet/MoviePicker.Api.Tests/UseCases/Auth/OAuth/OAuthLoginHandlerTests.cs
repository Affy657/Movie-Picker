using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Avatars;
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

        public OAuthLoginHandler CreateHandler() =>
            new(Users, Importer.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_NewAccount_ImportsTheProviderPhotoWithTheAccessToken()
    {
        var f = new Fixture();
        var withPhoto = new AvatarPhoto { Key = "0123456789abcdef0123456789abcdef", IsActive = true };
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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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

        var handler = new OAuthLoginHandler(users.Object, PassThroughImporter().Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLoginHandler>.Instance);

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
