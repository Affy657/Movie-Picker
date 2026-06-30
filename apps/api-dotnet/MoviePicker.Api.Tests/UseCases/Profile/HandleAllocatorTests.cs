using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class HandleAllocatorTests
{
    private readonly Mock<IUserRepository> _users = new();

    private void Taken(params string[] handles)
    {
        foreach (var h in handles)
            _users.Setup(u => u.GetByHandleAsync(h, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = "x", Handle = h });
    }

    [Fact]
    public async Task AllocateFromDisplayNameAsync_FreeBaseSlug_ReturnedAsIs()
    {
        _users.Setup(u => u.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var handle = await HandleAllocator.AllocateFromDisplayNameAsync(_users.Object, "Jean");

        Assert.Equal("jean", handle);
    }

    [Fact]
    public async Task AllocateFromDisplayNameAsync_Collision_AppendsSuffix()
    {
        _users.Setup(u => u.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        Taken("jean");

        var handle = await HandleAllocator.AllocateFromDisplayNameAsync(_users.Object, "Jean");

        Assert.Equal("jean2", handle);
    }

    [Fact]
    public async Task AllocateFromDisplayNameAsync_ChainedCollisions_TakesFirstFreeSuffix()
    {
        _users.Setup(u => u.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        Taken("jean", "jean2", "jean3");

        var handle = await HandleAllocator.AllocateFromDisplayNameAsync(_users.Object, "Jean");

        Assert.Equal("jean4", handle);
    }

    [Fact]
    public async Task AllocateFromDisplayNameAsync_LongName_StaysWithinMaxLength()
    {
        _users.Setup(u => u.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var longName = new string('a', 30);
        Taken(new string('a', HandlePolicy.MaxLength));

        var handle = await HandleAllocator.AllocateFromDisplayNameAsync(_users.Object, longName);

        Assert.True(handle.Length <= HandlePolicy.MaxLength);
        Assert.EndsWith("2", handle);
    }
}
