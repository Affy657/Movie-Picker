using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUserRepositoryTests
{
    private static readonly string[] NewestHandlesFirst = ["newer", "older"];

    private readonly InMemoryUserRepository _repo = new();

    private static User Mk(
        string id = "",
        string email = "Alice@Test.Local",
        string handle = "alice",
        string displayName = "Alice") => new()
        {
            Id = id,
            Email = email,
            PasswordHash = "hash",
            DisplayName = displayName,
            Handle = handle,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task AddAsync_GeneratesId_AndNormalizesEmailAndHandle()
    {
        var created = await _repo.AddAsync(Mk(email: "Alice@Test.Local", handle: "Alice"));

        Assert.Equal(24, created.Id.Length);
        Assert.Equal("alice@test.local", created.Email);
        Assert.Equal("alice", created.Handle);
    }

    [Fact]
    public async Task GetByEmailAsync_IsCaseInsensitive()
    {
        await _repo.AddAsync(Mk(email: "alice@test.local"));

        Assert.NotNull(await _repo.GetByEmailAsync("ALICE@TEST.LOCAL"));
        Assert.Null(await _repo.GetByEmailAsync("bob@test.local"));
        Assert.Null(await _repo.GetByEmailAsync("   "));
    }

    [Fact]
    public async Task GetByHandleAsync_IsCaseInsensitive()
    {
        await _repo.AddAsync(Mk(handle: "alice"));

        Assert.NotNull(await _repo.GetByHandleAsync("ALICE"));
        Assert.Null(await _repo.GetByHandleAsync("bob"));
        Assert.Null(await _repo.GetByHandleAsync(""));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenMissing()
    {
        Assert.Null(await _repo.GetByIdAsync("ghost"));
    }

    [Fact]
    public async Task ListByIdsAsync_ReturnsOnlyKnown()
    {
        var a = await _repo.AddAsync(Mk(email: "a@test.local", handle: "a"));
        var b = await _repo.AddAsync(Mk(email: "b@test.local", handle: "b"));

        var list = await _repo.ListByIdsAsync([a.Id, b.Id, "ghost"]);

        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task ListMissingHandleAsync_ReturnsOnlyHandleless()
    {
        await _repo.AddAsync(Mk(email: "a@test.local", handle: "a"));
        await _repo.AddAsync(Mk(email: "b@test.local", handle: ""));

        var missing = await _repo.ListMissingHandleAsync();

        Assert.Single(missing);
        Assert.Equal("b@test.local", missing[0].Email);
    }

    [Fact]
    public async Task UpdateAsync_RemapsEmailAndHandleIndexes()
    {
        var created = await _repo.AddAsync(Mk(email: "alice@test.local", handle: "alice"));

        await _repo.UpdateAsync(created with { Email = "alice2@test.local", Handle = "alice2" });

        Assert.Null(await _repo.GetByEmailAsync("alice@test.local"));
        Assert.Null(await _repo.GetByHandleAsync("alice"));
        Assert.NotNull(await _repo.GetByEmailAsync("alice2@test.local"));
        Assert.NotNull(await _repo.GetByHandleAsync("alice2"));
    }

    [Fact]
    public async Task UpdateAsync_PreservesSupporterSinceAndAvatarId()
    {
        var since = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var created = await _repo.AddAsync(Mk() with { SupporterSince = since, AvatarId = "bolt" });

        var updated = await _repo.UpdateAsync(created with { DisplayName = "Alice renamed" });

        Assert.Equal(since, updated.SupporterSince);
        Assert.Equal("bolt", updated.AvatarId);

        var reloaded = await _repo.GetByIdAsync(created.Id);
        Assert.Equal(since, reloaded!.SupporterSince);
        Assert.Equal("bolt", reloaded.AvatarId);
    }

    [Fact]
    public async Task DeleteAsync_RemovesUserAndIndexes()
    {
        var created = await _repo.AddAsync(Mk(email: "alice@test.local", handle: "alice"));

        Assert.False(await _repo.DeleteAsync("ghost"));
        Assert.True(await _repo.DeleteAsync(created.Id));
        Assert.Null(await _repo.GetByIdAsync(created.Id));
        Assert.Null(await _repo.GetByEmailAsync("alice@test.local"));
        Assert.Null(await _repo.GetByHandleAsync("alice"));
    }

    [Fact]
    public async Task ListPublicProfilesAsync_ExcludesPrivateAndHandleless()
    {
        await _repo.AddAsync(Mk(email: "pub@test.local", handle: "publicuser"));
        await _repo.AddAsync(Mk(email: "priv@test.local", handle: "privateuser") with { IsProfilePublic = false });
        await _repo.AddAsync(Mk(email: "none@test.local", handle: ""));

        var result = await _repo.ListPublicProfilesAsync(100);

        Assert.Single(result);
        Assert.Equal("publicuser", result[0].Handle);
    }

    [Fact]
    public async Task ListPublicProfilesAsync_OrdersByUpdatedAtDescending()
    {
        var older = Mk(email: "old@test.local", handle: "older") with { UpdatedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) };
        var newer = Mk(email: "new@test.local", handle: "newer") with { UpdatedAt = new DateTimeOffset(2026, 6, 1, 0, 0, 0, TimeSpan.Zero) };
        await _repo.AddAsync(older);
        await _repo.AddAsync(newer);

        var result = await _repo.ListPublicProfilesAsync(100);

        Assert.Equal(NewestHandlesFirst, result.Select(p => p.Handle).ToArray());
    }

    [Fact]
    public async Task ListPublicProfilesAsync_RespectsLimit()
    {
        for (var i = 0; i < 5; i++)
            await _repo.AddAsync(Mk(email: $"u{i}@test.local", handle: $"user{i}"));

        var result = await _repo.ListPublicProfilesAsync(3);

        Assert.Equal(3, result.Count);
    }

    [Fact]
    public async Task AddAsync_PersistsNotifyOnNewFollower()
    {
        var created = await _repo.AddAsync(Mk() with
        {
            NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.NewFollower] = false }
        });

        Assert.False(created.NotifiesOn(UserNotificationType.NewFollower));
    }

    [Fact]
    public async Task UpdateAsync_PersistsNotifyOnNewFollower()
    {
        var created = await _repo.AddAsync(Mk() with
        {
            NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.NewFollower] = true }
        });
        var toUpdate = created with
        {
            NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.NewFollower] = false }
        };
        Assert.False(toUpdate.NotifiesOn(UserNotificationType.NewFollower));

        var updated = await _repo.UpdateAsync(toUpdate);

        Assert.False(updated.NotifiesOn(UserNotificationType.NewFollower));
        Assert.False((await _repo.GetByIdAsync(created.Id))!.NotifiesOn(UserNotificationType.NewFollower));
    }

    [Fact]
    public async Task AddAsync_PersistsLetterboxdUsername()
    {
        var created = await _repo.AddAsync(Mk() with { LetterboxdUsername = "dave_v" });

        Assert.Equal("dave_v", created.LetterboxdUsername);
    }

    [Fact]
    public async Task ListWithLetterboxdSyncEnabledAsync_ReturnsOnlyConfiguredUsers()
    {
        await _repo.AddAsync(Mk(email: "a@test.local", handle: "a") with { LetterboxdUsername = "dave_v" });
        await _repo.AddAsync(Mk(email: "b@test.local", handle: "b"));
        await _repo.AddAsync(Mk(email: "c@test.local", handle: "c") with { LetterboxdUsername = "" });

        var result = await _repo.ListWithLetterboxdSyncEnabledAsync();

        Assert.Single(result);
        Assert.Equal("dave_v", result[0].LetterboxdUsername);
    }

    [Fact]
    public async Task SearchPublicAsync_MatchesDisplayNameAndHandleAnywhere()
    {
        await _repo.AddAsync(Mk(email: "lea@test.local", handle: "lea_m", displayName: "Léa Moreau"));
        await _repo.AddAsync(Mk(email: "sofia@test.local", handle: "sofiamorgane", displayName: "Sofia Benali"));
        await _repo.AddAsync(Mk(email: "paul@test.local", handle: "paulv", displayName: "Paul Vidal"));

        var found = await _repo.SearchPublicAsync("mor", 20);

        Assert.Equal(["lea_m", "sofiamorgane"], found.Select(u => u.Handle).Order());
    }

    [Fact]
    public async Task SearchPublicAsync_IgnoresDiacritics()
    {
        await _repo.AddAsync(Mk(email: "lea@test.local", handle: "lea_m", displayName: "Léa Moreau"));

        var found = await _repo.SearchPublicAsync("lea", 20);

        Assert.Equal("lea_m", found.Single().Handle);
    }

    [Fact]
    public async Task SearchPublicAsync_ExcludesPrivateProfiles()
    {
        var user = Mk(email: "lea@test.local", handle: "lea_m", displayName: "Léa Moreau") with { IsProfilePublic = false };
        await _repo.AddAsync(user);

        var found = await _repo.SearchPublicAsync("moreau", 20);

        Assert.Empty(found);
    }

    [Fact]
    public async Task SearchPublicAsync_ExcludesUsersWithoutHandle()
    {
        await _repo.AddAsync(Mk(email: "lea@test.local", handle: "", displayName: "Léa Moreau"));

        var found = await _repo.SearchPublicAsync("moreau", 20);

        Assert.Empty(found);
    }

    [Fact]
    public async Task SearchPublicAsync_QueryTooShort_ReturnsEmpty()
    {
        await _repo.AddAsync(Mk(email: "lea@test.local", handle: "lea_m", displayName: "Léa Moreau"));

        Assert.Empty(await _repo.SearchPublicAsync("m", 20));
        Assert.Empty(await _repo.SearchPublicAsync("  ", 20));
    }

    [Fact]
    public async Task SearchPublicAsync_HonoursTheLimit()
    {
        await _repo.AddAsync(Mk(email: "a@test.local", handle: "morgane_a", displayName: "Morgane A"));
        await _repo.AddAsync(Mk(email: "b@test.local", handle: "morgane_b", displayName: "Morgane B"));

        var found = await _repo.SearchPublicAsync("morgane", 1);

        Assert.Single(found);
    }

    [Fact]
    public async Task SearchPublicAsync_KeepsPrefixMatchesWhenTheLimitTruncates()
    {
        for (var index = 0; index < 300; index++)
            await _repo.AddAsync(Mk(
                email: $"noise{index}@test.local",
                handle: $"contested{index}morgane",
                displayName: $"Bruit {index}"));
        await _repo.AddAsync(Mk(email: "lea@test.local", handle: "lea_m", displayName: "Morgane Leroy"));

        var found = await _repo.SearchPublicAsync("morgane", 20);

        Assert.Equal(20, found.Count);
        Assert.Equal("lea_m", found[0].Handle);
    }

    [Fact]
    public async Task SearchPublicAsync_OrdersDeterministicallyAcrossCalls()
    {
        for (var index = 0; index < 10; index++)
            await _repo.AddAsync(Mk(
                email: $"user{index}@test.local",
                handle: $"morgane{index}",
                displayName: $"Morgane {index}"));

        var first = await _repo.SearchPublicAsync("morgane", 5);
        var second = await _repo.SearchPublicAsync("morgane", 5);

        Assert.Equal(first.Select(u => u.Handle), second.Select(u => u.Handle));
    }
}
