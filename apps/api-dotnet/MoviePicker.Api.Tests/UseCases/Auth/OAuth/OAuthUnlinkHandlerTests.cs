using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.OAuth;

public sealed class OAuthUnlinkHandlerTests
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
        public Mock<IAuthSessionInvalidator> Sessions { get; } = new();

        public OAuthUnlinkHandler CreateHandler() =>
            new(Users, Sessions.Object, new FakeTimeProvider(TestEpoch), NullLogger<OAuthUnlinkHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_UserMissing_ThrowsNotFound()
    {
        var f = new Fixture();
        await Assert.ThrowsAsync<NotFoundException>(() => f.CreateHandler().HandleAsync("missing", "google", "session-1"));
    }

    [Fact]
    public async Task HandleAsync_ProviderNotLinked_ThrowsNotFound()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        await Assert.ThrowsAsync<NotFoundException>(() => f.CreateHandler().HandleAsync(user.Id, "google", "session-1"));
        f.Sessions.Verify(
            x => x.InvalidateOthersForUserAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_HasPassword_RemovesIdentity()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "neo@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        await f.CreateHandler().HandleAsync(user.Id, "google", "session-1");

        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Empty(reloaded!.Identities);
    }

    [Fact]
    public async Task HandleAsync_NoPasswordButAnotherIdentityRemains_RemovesIdentity()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            Identities =
            [
                new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "neo@example.com", LinkedAt = TestEpoch },
                new LinkedIdentity { Provider = "github", Subject = "gh-1", Email = "neo@example.com", LinkedAt = TestEpoch }
            ],
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        await f.CreateHandler().HandleAsync(user.Id, "google", "session-1");

        var reloaded = await f.Users.GetByIdAsync(user.Id);
        var remaining = Assert.Single(reloaded!.Identities);
        Assert.Equal("github", remaining.Provider);
    }

    [Fact]
    public async Task HandleAsync_NoPasswordAndLastIdentity_ThrowsBadRequest()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "neo@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        await Assert.ThrowsAsync<BadRequestException>(() => f.CreateHandler().HandleAsync(user.Id, "google", "session-1"));

        var reloaded = await f.Users.GetByIdAsync(user.Id);
        Assert.Single(reloaded!.Identities);
        f.Sessions.Verify(
            x => x.InvalidateOthersForUserAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_RemembersTheUnlinkedIdentity()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            Identities = [new LinkedIdentity { Provider = "github", Subject = "gh-1", Email = "neo@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        await f.CreateHandler().HandleAsync(user.Id, "github", "session-1");

        var reloaded = await f.Users.GetByIdAsync(user.Id);
        var unlinked = Assert.Single(reloaded!.UnlinkedIdentities);
        Assert.Equal(("github", "gh-1", TestEpoch), (unlinked.Provider, unlinked.Subject, unlinked.UnlinkedAt));
    }

    [Fact]
    public async Task HandleAsync_RevokesTheOtherSessionsButKeepsTheCurrentOne()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            PasswordHash = "hash",
            Identities = [new LinkedIdentity { Provider = "github", Subject = "gh-1", Email = "neo@example.com", LinkedAt = TestEpoch }],
            CreatedAt = TestEpoch,
            UpdatedAt = TestEpoch
        });

        await f.CreateHandler().HandleAsync(user.Id, "github", "session-1");

        f.Sessions.Verify(x => x.InvalidateOthersForUserAsync(user.Id, "session-1", It.IsAny<CancellationToken>()), Times.Once);
        f.Sessions.Verify(x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
