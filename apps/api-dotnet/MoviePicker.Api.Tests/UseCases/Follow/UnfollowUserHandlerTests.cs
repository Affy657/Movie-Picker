using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Follow;

public sealed class UnfollowUserHandlerTests
{
    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly UnfollowUserHandler _sut;

    public UnfollowUserHandlerTests()
    {
        _sut = new UnfollowUserHandler(_follows.Object, _users.Object);
    }

    [Fact]
    public async Task HandleAsync_TargetNotFound_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("me", "alice"));
        _follows.Verify(f => f.UnfollowAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TargetFound_Unfollows()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "target", Handle = "alice" });

        await _sut.HandleAsync("me", "alice");

        _follows.Verify(f => f.UnfollowAsync("me", "target", It.IsAny<CancellationToken>()), Times.Once);
    }
}
