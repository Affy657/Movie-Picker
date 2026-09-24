using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoDuplicateKeyMappingTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoDuplicateKeyMappingTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static User NewUser(
        string suffix,
        string? handle = null,
        IReadOnlyList<LinkedIdentity>? identities = null) => new()
        {
            Id = string.Empty,
            Email = $"dup-{suffix}@integration.test",
            PasswordHash = "hash",
            DisplayName = $"Utilisateur {suffix}",
            Handle = handle ?? $"handle{suffix}",
            Identities = identities ?? Array.Empty<LinkedIdentity>(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    private async Task<T> WithUsersAsync<T>(Func<IUserRepository, Task<T>> body)
    {
        using var scope = _factory.Services.CreateScope();
        return await body(scope.ServiceProvider.GetRequiredService<IUserRepository>());
    }

    [MongoFact]
    public async Task InsertingTheSameHandleTwice_IsRejectedAsHandleConflict()
    {
        var taken = "pseudopris" + Guid.NewGuid().ToString("N")[..8];
        await WithUsersAsync(users => users.AddAsync(NewUser(Guid.NewGuid().ToString("N")[..8], taken)));

        var conflict = await Assert.ThrowsAsync<ConflictException>(() =>
            WithUsersAsync(users => users.AddAsync(NewUser(Guid.NewGuid().ToString("N")[..8], taken))));

        Assert.Equal(ErrorCodes.HandleTaken, conflict.Reason);
    }

    [MongoFact]
    public async Task InsertingTheSameIdentityTwice_IsRejectedAsIdentityConflict()
    {
        var subject = Guid.NewGuid().ToString("N");
        var identity = new LinkedIdentity
        {
            Provider = "google",
            Subject = subject,
            Email = "identity@integration.test",
            LinkedAt = DateTimeOffset.UtcNow
        };

        await WithUsersAsync(users => users.AddAsync(
            NewUser(Guid.NewGuid().ToString("N")[..8], identities: [identity])));

        var conflict = await Assert.ThrowsAsync<ConflictException>(() =>
            WithUsersAsync(users => users.AddAsync(
                NewUser(Guid.NewGuid().ToString("N")[..8], identities: [identity]))));

        Assert.Equal(ErrorCodes.IdentityConflict, conflict.Reason);
    }

    [MongoFact]
    public async Task InsertingTheSameEmailTwice_IsRejectedAsEmailConflict()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await WithUsersAsync(users => users.AddAsync(NewUser(suffix)));

        var conflict = await Assert.ThrowsAsync<ConflictException>(() =>
            WithUsersAsync(users => users.AddAsync(
                NewUser(suffix, handle: "autre" + Guid.NewGuid().ToString("N")[..8]))));

        Assert.Equal(ErrorCodes.EmailTaken, conflict.Reason);
    }

    [MongoFact]
    public async Task UpdatingTowardsATakenHandle_IsRejectedAsHandleConflict()
    {
        var taken = "deja" + Guid.NewGuid().ToString("N")[..8];
        await WithUsersAsync(users => users.AddAsync(NewUser(Guid.NewGuid().ToString("N")[..8], taken)));
        var mover = await WithUsersAsync(users => users.AddAsync(NewUser(Guid.NewGuid().ToString("N")[..8])));

        var conflict = await Assert.ThrowsAsync<ConflictException>(() =>
            WithUsersAsync(users => users.UpdateAsync(mover with { Handle = taken })));

        Assert.Equal(ErrorCodes.HandleTaken, conflict.Reason);
    }

    private sealed class RaceLosingUsers(IUserRepository inner, User? readByEmail) : IUserRepository
    {
        private int _identityReads;

        public Task<User?> GetByIdentityAsync(string provider, string subject, CancellationToken ct = default) =>
            Interlocked.Increment(ref _identityReads) == 1
                ? Task.FromResult<User?>(null)
                : inner.GetByIdentityAsync(provider, subject, ct);

        public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) => Task.FromResult(readByEmail);

        public Task<User?> GetByIdAsync(string id, CancellationToken ct = default) => inner.GetByIdAsync(id, ct);
        public Task<IReadOnlyList<User>> ListByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default) => inner.ListByIdsAsync(ids, ct);
        public Task<IReadOnlyList<UserCard>> ListCardsByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default) => inner.ListCardsByIdsAsync(ids, ct);
        public Task<User?> GetByHandleAsync(string handle, CancellationToken ct = default) => inner.GetByHandleAsync(handle, ct);
        public Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct = default) => inner.ListMissingHandleAsync(ct);
        public Task<IReadOnlyList<User>> ListWithLetterboxdSyncEnabledAsync(CancellationToken ct = default) => inner.ListWithLetterboxdSyncEnabledAsync(ct);
        public Task<IReadOnlyList<User>> SearchPublicAsync(string query, int limit, CancellationToken ct = default) => inner.SearchPublicAsync(query, limit, ct);
        public Task SetLetterboxdSyncStatusAsync(string userId, DateTimeOffset syncedAt, string? error, CancellationToken ct = default) =>
            inner.SetLetterboxdSyncStatusAsync(userId, syncedAt, error, ct);
        public Task SetLetterboxdPendingReconciliationCountAsync(string userId, int pendingCount, CancellationToken ct = default) =>
            inner.SetLetterboxdPendingReconciliationCountAsync(userId, pendingCount, ct);
        public Task<bool> MarkSupporterAsync(string userId, DateTimeOffset since, CancellationToken ct = default) => inner.MarkSupporterAsync(userId, since, ct);
        public Task<bool> AddEventTemplateAsync(string userId, EventTemplate template, int maxPerUser, DateTimeOffset now, CancellationToken ct = default) =>
            inner.AddEventTemplateAsync(userId, template, maxPerUser, now, ct);
        public Task<bool> ReplaceEventTemplateAsync(string userId, EventTemplate template, DateTimeOffset now, CancellationToken ct = default) =>
            inner.ReplaceEventTemplateAsync(userId, template, now, ct);
        public Task<bool> RemoveEventTemplateAsync(string userId, string templateId, DateTimeOffset now, CancellationToken ct = default) =>
            inner.RemoveEventTemplateAsync(userId, templateId, now, ct);
        public Task<IReadOnlyList<PublicProfileRef>> ListPublicProfilesAsync(int limit, CancellationToken ct = default) => inner.ListPublicProfilesAsync(limit, ct);
        public Task<User> AddAsync(User user, CancellationToken ct = default) => inner.AddAsync(user, ct);
        public Task<User> UpdateAsync(User user, CancellationToken ct = default) => inner.UpdateAsync(user, ct);
        public Task<bool> DeleteAsync(string id, CancellationToken ct = default) => inner.DeleteAsync(id, ct);
    }

    private static ExternalLoginInfo GoogleSignIn(string subject, string email) => new()
    {
        Provider = "google",
        Subject = subject,
        Email = email,
        EmailVerified = true,
        DisplayName = "Course"
    };

    private static LinkedIdentity Google(string subject, string email) => new()
    {
        Provider = "google",
        Subject = subject,
        Email = email,
        LinkedAt = DateTimeOffset.UtcNow
    };

    [MongoFact]
    public async Task OAuthFirstSignIn_LosingTheRaceToCreateTheAccount_SignsInTheAccountThatWon()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var subject = Guid.NewGuid().ToString("N");
        var winner = await users.AddAsync(NewUser(suffix, identities: [Google(subject, $"dup-{suffix}@integration.test")]) with
        {
            PasswordHash = string.Empty
        });
        var loser = new OAuthLoginHandler(new RaceLosingUsers(users, null), TimeProvider.System, NullLogger<OAuthLoginHandler>.Instance);

        var outcome = await loser.HandleAsync(GoogleSignIn(subject, winner.Email));

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal(winner.Id, outcome.User!.Id);
    }

    [MongoFact]
    public async Task OAuthFirstSignIn_LosingTheRaceToLinkAnExistingAccount_SignsInTheAccountThatWon()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var subject = Guid.NewGuid().ToString("N");
        var readBeforeTheWinner = await users.AddAsync(NewUser(suffix) with { PasswordHash = string.Empty });
        var winner = await users.UpdateAsync(readBeforeTheWinner with
        {
            Identities = [Google(subject, readBeforeTheWinner.Email)]
        });
        var loser = new OAuthLoginHandler(
            new RaceLosingUsers(users, readBeforeTheWinner),
            TimeProvider.System,
            NullLogger<OAuthLoginHandler>.Instance);

        var outcome = await loser.HandleAsync(GoogleSignIn(subject, winner.Email));

        Assert.Equal(OAuthOutcomeKind.SignedIn, outcome.Kind);
        Assert.Equal(winner.Id, outcome.User!.Id);
    }
}
