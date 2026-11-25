using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAvatarPhotoRepositoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 3, 9, 0, 0, TimeSpan.Zero);

    private readonly InMemoryAvatarPhotoRepository _repo = new();

    private static StoredPhoto Photo(string key, string userId = "u1") => new()
    {
        Key = key,
        UserId = userId,
        ContentType = "image/webp",
        Data = [1, 2, 3],
        CreatedAt = Now
    };

    [Fact]
    public async Task Save_ThenGet_ReturnsTheStoredBytes()
    {
        await _repo.SaveAsync(Photo("k1"));

        var stored = await _repo.GetByKeyAsync("k1");

        Assert.NotNull(stored);
        Assert.Equal("image/webp", stored!.ContentType);
        Assert.Equal([1, 2, 3], stored.Data);
    }

    [Fact]
    public async Task EstimatedCount_FollowsTheStoredPhotos()
    {
        await _repo.SaveAsync(Photo("k1"));
        await _repo.SaveAsync(Photo("k2"));
        await _repo.DeleteAsync("k1");

        Assert.Equal(1, await _repo.EstimatedCountAsync());
    }

    [Fact]
    public async Task Get_UnknownKey_ReturnsNull()
    {
        Assert.Null(await _repo.GetByKeyAsync("missing"));
    }

    [Fact]
    public async Task Delete_RemovesOnlyThatPhoto()
    {
        await _repo.SaveAsync(Photo("k1"));
        await _repo.SaveAsync(Photo("k2"));

        await _repo.DeleteAsync("k1");

        Assert.Null(await _repo.GetByKeyAsync("k1"));
        Assert.NotNull(await _repo.GetByKeyAsync("k2"));
    }

    [Fact]
    public async Task ScheduleDeletion_KeepsServingThePhotoUntilItsTimeComes()
    {
        var clock = new MovableClock(Now);
        var repo = new InMemoryAvatarPhotoRepository(clock);
        await repo.SaveAsync(Photo("k1"));
        await repo.SaveAsync(Photo("k2"));

        await repo.ScheduleDeletionAsync("k1", Now.AddMinutes(10));
        clock.Advance(TimeSpan.FromMinutes(10) - TimeSpan.FromSeconds(1));

        Assert.NotNull(await repo.GetByKeyAsync("k1"));
        clock.Advance(TimeSpan.FromSeconds(1));
        Assert.Null(await repo.GetByKeyAsync("k1"));
        Assert.NotNull(await repo.GetByKeyAsync("k2"));
        Assert.Equal(1, await repo.EstimatedCountAsync());
    }

    [Fact]
    public async Task ScheduleDeletion_UnknownKey_StoresNothing()
    {
        await _repo.ScheduleDeletionAsync("missing", Now);

        Assert.Equal(0, await _repo.EstimatedCountAsync());
    }

    [Fact]
    public async Task DeleteByUserId_RemovesEveryPhotoOfThatUserOnly()
    {
        await _repo.SaveAsync(Photo("k1", "u1"));
        await _repo.SaveAsync(Photo("k2", "u1"));
        await _repo.SaveAsync(Photo("k3", "u2"));

        var deleted = await _repo.DeleteByUserIdAsync("u1");

        Assert.Equal(2, deleted);
        Assert.Null(await _repo.GetByKeyAsync("k1"));
        Assert.Null(await _repo.GetByKeyAsync("k2"));
        Assert.NotNull(await _repo.GetByKeyAsync("k3"));
    }
}
