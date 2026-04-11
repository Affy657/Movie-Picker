using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class RegisterUserHandlerTests
{
    [Fact]
    public async Task HandleAsync_DuplicateEmail_ThrowsConflict()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("a@b.co", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = "1",
                Email = "a@b.co",
                PasswordHash = "x",
                DisplayName = "Old",
                UiTheme = UiThemePreference.System,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        var hasher = new Mock<IPasswordHasher<User>>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance);

        await Assert.ThrowsAsync<ConflictException>(() =>
            handler.HandleAsync(
                new RegisterRequest { Email = "a@b.co", Password = "abcd1234", DisplayName = "New" }));
    }

    [Fact]
    public async Task HandleAsync_WeakPassword_ThrowsBadRequest()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher<User>>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(
                new RegisterRequest { Email = "a@b.co", Password = "short", DisplayName = "N" }));
    }

    [Fact]
    public async Task HandleAsync_PasswordWithoutDigit_ThrowsBadRequest()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher<User>>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(
                new RegisterRequest { Email = "a@b.co", Password = "abcdefgh", DisplayName = "N" }));
    }

    [Fact]
    public async Task HandleAsync_EmptyDisplayName_ThrowsBadRequest()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher<User>>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(
                new RegisterRequest { Email = "a@b.co", Password = "abcd1234", DisplayName = "  " }));
    }

    [Fact]
    public async Task HandleAsync_CreatesUserWithHashedPassword()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync("new@b.co", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        User? captured = null;
        users
            .Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                captured = u;
                return new User
                {
                    Id = "generated-id",
                    Email = u.Email,
                    PasswordHash = u.PasswordHash,
                    DisplayName = u.DisplayName,
                    UiTheme = u.UiTheme,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                };
            });
        var hasher = new Mock<IPasswordHasher<User>>();
        hasher
            .Setup(x => x.HashPassword(It.IsAny<User>(), "abcd1234"))
            .Returns("HASH_FROM_HASHER");

        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance);
        var res = await handler.HandleAsync(
            new RegisterRequest { Email = "new@b.co", Password = "abcd1234", DisplayName = "Neo" });

        Assert.Equal("generated-id", res.UserId);
        Assert.Equal("Neo", res.DisplayName);
        Assert.NotNull(captured);
        Assert.Equal("HASH_FROM_HASHER", captured!.PasswordHash);
        Assert.NotEqual("abcd1234", captured.PasswordHash);
        users.Verify(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
