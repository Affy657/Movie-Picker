using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUserRepositoryTests
{
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
    public async Task DeleteAsync_RemovesUserAndIndexes()
    {
        var created = await _repo.AddAsync(Mk(email: "alice@test.local", handle: "alice"));

        Assert.False(await _repo.DeleteAsync("ghost"));
        Assert.True(await _repo.DeleteAsync(created.Id));
        Assert.Null(await _repo.GetByIdAsync(created.Id));
        Assert.Null(await _repo.GetByEmailAsync("alice@test.local"));
        Assert.Null(await _repo.GetByHandleAsync("alice"));
    }
}
