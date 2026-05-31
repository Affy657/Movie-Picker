using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class CheckHandleAvailabilityHandlerTests
{
    private static User User(string id, string handle) => new()
    {
        Id = id,
        Email = "a@b.co",
        PasswordHash = "h",
        DisplayName = "X",
        Handle = handle,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_FreeHandle_IsAvailable()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByHandleAsync("free", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var handler = new CheckHandleAvailabilityHandler(users.Object);

        var res = await handler.HandleAsync("free", currentUserId: null);

        Assert.True(res.Available);
        Assert.Equal("free", res.Handle);
    }

    [Fact]
    public async Task HandleAsync_TakenByOther_IsUnavailable()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByHandleAsync("taken", It.IsAny<CancellationToken>())).ReturnsAsync(User("other", "taken"));
        var handler = new CheckHandleAvailabilityHandler(users.Object);

        var res = await handler.HandleAsync("taken", currentUserId: "me");

        Assert.False(res.Available);
        Assert.NotNull(res.Reason);
    }

    [Fact]
    public async Task HandleAsync_OwnCurrentHandle_IsAvailable()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByHandleAsync("mine", It.IsAny<CancellationToken>())).ReturnsAsync(User("me", "mine"));
        var handler = new CheckHandleAvailabilityHandler(users.Object);

        var res = await handler.HandleAsync("mine", currentUserId: "me");

        Assert.True(res.Available);
    }

    [Fact]
    public async Task HandleAsync_InvalidHandle_IsUnavailableWithReason()
    {
        var users = new Mock<IUserRepository>();
        var handler = new CheckHandleAvailabilityHandler(users.Object);

        var res = await handler.HandleAsync("ab", currentUserId: null);

        Assert.False(res.Available);
        Assert.NotNull(res.Reason);
        users.Verify(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
