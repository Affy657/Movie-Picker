using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.OAuth;

public sealed class OAuthLinkHandlerTests
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

        public OAuthLinkHandler CreateHandler() =>
            new(Users, new FakeTimeProvider(TestEpoch), NullLogger<OAuthLinkHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_NoExistingIdentity_LinksToCurrentUser()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            CreatedAt = TestEpoch.AddDays(-1),
            UpdatedAt = TestEpoch.AddDays(-1)
        });

        var outcome = await f.CreateHandler().HandleAsync(user.Id, new ExternalLoginInfo
        {
            Provider = "github",
            Subject = "gh-1",
            Email = "neo@github.example",
            EmailVerified = true,
            DisplayName = "Neo"
        });

        Assert.Equal(OAuthOutcomeKind.Linked, outcome.Kind);
        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Single(reloaded!.Identities);
        Assert.Equal("github", reloaded.Identities[0].Provider);
    }

    [Fact]
    public async Task HandleAsync_IdentityAlreadyLinkedToSameUser_IsNoOp()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "neo@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch.AddDays(-1),
            UpdatedAt = TestEpoch.AddDays(-1)
        });

        var outcome = await f.CreateHandler().HandleAsync(user.Id, new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "g-1",
            Email = "neo@example.com",
            EmailVerified = true,
            DisplayName = "Neo"
        });

        Assert.Equal(OAuthOutcomeKind.Linked, outcome.Kind);
        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Single(reloaded!.Identities);
    }

    [Fact]
    public async Task HandleAsync_IdentityLinkedToOtherAccount_ReturnsConflictOutcome()
    {
        var f = new Fixture();
        var owner = await f.Users.AddAsync(new User
        {
            Email = "trinity@example.com",
            DisplayName = "Trinity",
            Handle = "trinity",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-2", Email = "trinity@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch.AddDays(-1),
            UpdatedAt = TestEpoch.AddDays(-1)
        });
        var currentUser = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            CreatedAt = TestEpoch.AddDays(-1),
            UpdatedAt = TestEpoch.AddDays(-1)
        });

        var outcome = await f.CreateHandler().HandleAsync(currentUser.Id, new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "g-2",
            Email = "trinity@example.com",
            EmailVerified = true,
            DisplayName = "Trinity"
        });

        Assert.Equal(OAuthOutcomeKind.IdentityLinkedToOtherAccount, outcome.Kind);
        var reloadedOwner = await f.Users.GetByIdAsync(owner.Id);
        Assert.Single(reloadedOwner!.Identities);
        var reloadedCurrent = await f.Users.GetByIdAsync(currentUser.Id);
        Assert.Empty(reloadedCurrent!.Identities);
    }

    [Fact]
    public async Task HandleAsync_RelinkingSameProviderWithDifferentAccount_ReplacesPreviousIdentity()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-old", Email = "neo-old@example.com", LinkedAt = TestEpoch.AddDays(-1) }],
            CreatedAt = TestEpoch.AddDays(-1),
            UpdatedAt = TestEpoch.AddDays(-1)
        });

        var outcome = await f.CreateHandler().HandleAsync(user.Id, new ExternalLoginInfo
        {
            Provider = "google",
            Subject = "g-new",
            Email = "neo-new@example.com",
            EmailVerified = true,
            DisplayName = "Neo"
        });

        Assert.Equal(OAuthOutcomeKind.Linked, outcome.Kind);
        var reloaded = await f.Users.GetByIdAsync(user.Id);
        var identity = Assert.Single(reloaded!.Identities);
        Assert.Equal("g-new", identity.Subject);
        Assert.Null(await f.Users.GetByIdentityAsync("google", "g-old"));
    }

    [Fact]
    public async Task HandleAsync_CurrentUserMissing_ThrowsNotFound()
    {
        var f = new Fixture();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            f.CreateHandler().HandleAsync("missing", new ExternalLoginInfo
            {
                Provider = "google",
                Subject = "g-3",
                Email = "ghost@example.com",
                EmailVerified = true,
                DisplayName = "Ghost"
            }));
    }
}
