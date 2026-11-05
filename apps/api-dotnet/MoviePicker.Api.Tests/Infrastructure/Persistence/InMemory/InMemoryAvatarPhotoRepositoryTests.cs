using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAvatarPhotoRepositoryTests
{
    private readonly InMemoryAvatarPhotoRepository _repo = new();

    private static StoredAvatarPhoto Photo(string key, string userId = "u1") => new()
    {
        Key = key,
        UserId = userId,
        ContentType = "image/webp",
        Data = [1, 2, 3],
        CreatedAt = new DateTimeOffset(2026, 10, 3, 9, 0, 0, TimeSpan.Zero)
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
