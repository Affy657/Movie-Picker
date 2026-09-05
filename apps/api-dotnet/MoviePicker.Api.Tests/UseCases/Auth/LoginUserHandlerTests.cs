using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class LoginUserHandlerTests
{
    private static User SampleUser(string id = "u1", string email = "a@b.co") =>
        new()
        {
            Id = id,
            Email = email,
            PasswordHash = "HASHED",
            DisplayName = "Alice",
            UiTheme = UiThemePreference.System,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task HandleAsync_UnknownEmail_ThrowsUnauthorized()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher>();
        var handler = new LoginUserHandler(users.Object, hasher.Object);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            handler.HandleAsync(new LoginRequest { Email = "x@y.z", Password = "abcd1234" }));
        hasher.Verify(
            x => x.Verify(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WrongPassword_ThrowsUnauthorized()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("a@b.co", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var hasher = new Mock<IPasswordHasher>();
        hasher
            .Setup(x => x.Verify(user.PasswordHash, "wrong"))
            .Returns(PasswordVerification.Failed);
        var handler = new LoginUserHandler(users.Object, hasher.Object);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            handler.HandleAsync(new LoginRequest { Email = "a@b.co", Password = "wrong" }));
    }

    [Fact]
    public async Task HandleAsync_NoPasswordSet_ThrowsUnauthorized()
    {
        var user = SampleUser() with { PasswordHash = string.Empty };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("a@b.co", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var hasher = new Mock<IPasswordHasher>();
        var handler = new LoginUserHandler(users.Object, hasher.Object);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            handler.HandleAsync(new LoginRequest { Email = "a@b.co", Password = "abcd1234" }));
        hasher.Verify(
            x => x.Verify(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ValidCredentials_ReturnsResponse()
    {
        var user = SampleUser();
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("a@b.co", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var hasher = new Mock<IPasswordHasher>();
        hasher
            .Setup(x => x.Verify(user.PasswordHash, "abcd1234"))
            .Returns(PasswordVerification.Success);
        var handler = new LoginUserHandler(users.Object, hasher.Object);

        var res = await handler.HandleAsync(new LoginRequest { Email = "a@b.co", Password = "abcd1234" });

        Assert.Equal("u1", res.UserId);
        Assert.Equal("Alice", res.DisplayName);
    }
}
