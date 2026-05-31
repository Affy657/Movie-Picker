using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class GetPublicProfileHandlerTests
{
    private static User User(bool isPublic) => new()
    {
        Id = "u1",
        Email = "secret@private.co",
        PasswordHash = "h",
        DisplayName = "Alice",
        Handle = "alice",
        Bio = "Cinéphile",
        AvatarId = "alpha",
        IsProfilePublic = isPublic,
        CreatedAt = new DateTimeOffset(2024, 3, 1, 0, 0, 0, TimeSpan.Zero),
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_PublicProfile_ReturnsDataWithoutEmail()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(User(true));
        var handler = new GetPublicProfileHandler(users.Object);

        var res = await handler.HandleAsync("Alice");

        Assert.Equal("alice", res.Handle);
        Assert.Equal("Alice", res.DisplayName);
        Assert.Equal("Cinéphile", res.Bio);
        Assert.Equal("alpha", res.AvatarId);
        Assert.Equal(new DateTimeOffset(2024, 3, 1, 0, 0, 0, TimeSpan.Zero), res.MemberSince);
    }

    [Fact]
    public async Task HandleAsync_PrivateProfile_ThrowsNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(User(false));
        var handler = new GetPublicProfileHandler(users.Object);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice"));
    }

    [Fact]
    public async Task HandleAsync_UnknownHandle_ThrowsNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var handler = new GetPublicProfileHandler(users.Object);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("ghost"));
    }
}
