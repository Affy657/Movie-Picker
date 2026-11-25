using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Auth.EmailVerification;
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
        var hasher = new Mock<IPasswordHasher>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());

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
        var hasher = new Mock<IPasswordHasher>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());

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
        var hasher = new Mock<IPasswordHasher>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(
                new RegisterRequest { Email = "a@b.co", Password = "abcdefgh", DisplayName = "N" }));
    }

    [Fact]
    public async Task HandleAsync_EmailWithoutTopLevelDomain_IsRefusedBeforeAnyLookup()
    {
        var users = new Mock<IUserRepository>();
        var handler = new RegisterUserHandler(users.Object, Mock.Of<IPasswordHasher>(), NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(
                new RegisterRequest { Email = "alice@exemple", Password = "abcd1234", DisplayName = "Alice" }));

        Assert.Equal(ErrorCodes.EmailInvalid, ex.Reason);
        users.Verify(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DisplayNameWithARightToLeftOverride_IsStoredWithoutIt()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        users.Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u with { Id = "new" });
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns("hash");
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());

        var res = await handler.HandleAsync(
            new RegisterRequest { Email = "rtl@b.co", Password = "abcd1234", DisplayName = "\u202Eecila" });

        Assert.Equal("ecila", res.DisplayName);
    }

    [Fact]
    public async Task HandleAsync_EmptyDisplayName_ThrowsBadRequest()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var hasher = new Mock<IPasswordHasher>();
        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());

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
        var hasher = new Mock<IPasswordHasher>();
        hasher
            .Setup(x => x.Hash("abcd1234"))
            .Returns("HASH_FROM_HASHER");

        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());
        var res = await handler.HandleAsync(
            new RegisterRequest { Email = "new@b.co", Password = "abcd1234", DisplayName = "Neo" });

        Assert.Equal("generated-id", res.UserId);
        Assert.Equal("Neo", res.DisplayName);
        Assert.NotNull(captured);
        Assert.Equal("HASH_FROM_HASHER", captured!.PasswordHash);
        Assert.NotEqual("abcd1234", captured.PasswordHash);
        users.Verify(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_GeneratesHandleFromDisplayName()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        User? captured = null;
        users
            .Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                captured = u;
                return u with { Id = "generated-id" };
            });
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("HASH");

        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());
        await handler.HandleAsync(
            new RegisterRequest { Email = "jean@b.co", Password = "abcd1234", DisplayName = "Jean Dupont" });

        Assert.NotNull(captured);
        Assert.Equal("jean_dupont", captured!.Handle);
    }

    [Fact]
    public async Task HandleAsync_DeduplicatesHandleOnCollision()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "x", Email = "x@y.z", PasswordHash = "h", DisplayName = "Alice", Handle = "alice" });
        users.Setup(x => x.GetByHandleAsync("alice2", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        User? captured = null;
        users
            .Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                captured = u;
                return u with { Id = "id2" };
            });
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("HASH");

        var handler = new RegisterUserHandler(users.Object, hasher.Object, NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, Mock.Of<IEmailVerificationMailer>());
        await handler.HandleAsync(
            new RegisterRequest { Email = "alice@b.co", Password = "abcd1234", DisplayName = "Alice" });

        Assert.NotNull(captured);
        Assert.Equal("alice2", captured!.Handle);
    }

    private static Mock<IUserRepository> AcceptingUsers()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        users.Setup(x => x.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u with { Id = "created-id" });
        return users;
    }

    private static RegisterUserHandler HandlerSendingThrough(IUserRepository users, IEmailVerificationMailer mailer) =>
        new(users, Mock.Of<IPasswordHasher>(h => h.Hash(It.IsAny<string>()) == "HASH"), NullLogger<RegisterUserHandler>.Instance, TimeProvider.System, mailer);

    [Fact]
    public async Task HandleAsync_NewAccount_StartsUnconfirmedAndIsSentAConfirmationEmailInTheAskedLanguage()
    {
        var mailer = new Mock<IEmailVerificationMailer>();

        await HandlerSendingThrough(AcceptingUsers().Object, mailer.Object).HandleAsync(
            new RegisterRequest { Email = "neo@b.co", Password = "abcd1234", DisplayName = "Neo", Locale = "en" });

        mailer.Verify(
            m => m.SendAsync(
                It.Is<User>(u => u.Id == "created-id" && u.Email == "neo@b.co" && u.EmailVerifiedAt == null),
                "en",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ConfirmationEmailCannotBeIssued_StillOpensTheAccount()
    {
        var mailer = new Mock<IEmailVerificationMailer>();
        mailer.Setup(m => m.SendAsync(It.IsAny<User>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("token store unavailable"));

        var response = await HandlerSendingThrough(AcceptingUsers().Object, mailer.Object).HandleAsync(
            new RegisterRequest { Email = "neo@b.co", Password = "abcd1234", DisplayName = "Neo" });

        Assert.Equal("created-id", response.UserId);
    }

    [Fact]
    public async Task HandleAsync_RefusedRegistration_SendsNoConfirmationEmail()
    {
        var users = AcceptingUsers();
        users.Setup(x => x.GetByEmailAsync("neo@b.co", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "occupant", Email = "neo@b.co" });
        var mailer = new Mock<IEmailVerificationMailer>();

        await Assert.ThrowsAsync<ConflictException>(() => HandlerSendingThrough(users.Object, mailer.Object).HandleAsync(
            new RegisterRequest { Email = "neo@b.co", Password = "abcd1234", DisplayName = "Neo" }));

        mailer.VerifyNoOtherCalls();
    }
}
