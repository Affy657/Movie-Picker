using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
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

        Assert.Equal("handle_conflict", conflict.Message);
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

        Assert.Equal("identity_conflict", conflict.Message);
    }

    [MongoFact]
    public async Task InsertingTheSameEmailTwice_IsRejectedAsEmailConflict()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await WithUsersAsync(users => users.AddAsync(NewUser(suffix)));

        var conflict = await Assert.ThrowsAsync<ConflictException>(() =>
            WithUsersAsync(users => users.AddAsync(
                NewUser(suffix, handle: "autre" + Guid.NewGuid().ToString("N")[..8]))));

        Assert.Equal("Un compte existe déjà pour cette adresse e-mail.", conflict.Message);
    }

    [MongoFact]
    public async Task UpdatingTowardsATakenHandle_IsRejectedAsHandleConflict()
    {
        var taken = "deja" + Guid.NewGuid().ToString("N")[..8];
        await WithUsersAsync(users => users.AddAsync(NewUser(Guid.NewGuid().ToString("N")[..8], taken)));
        var mover = await WithUsersAsync(users => users.AddAsync(NewUser(Guid.NewGuid().ToString("N")[..8])));

        var conflict = await Assert.ThrowsAsync<ConflictException>(() =>
            WithUsersAsync(users => users.UpdateAsync(mover with { Handle = taken })));

        Assert.Equal("handle_conflict", conflict.Message);
    }
}
