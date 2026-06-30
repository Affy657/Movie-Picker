using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class AuthControllerTests
{
    private static AuthController Controller(string? userId) =>
        new AuthController().WithContext(
            userId is null ? null : ControllerTestHelpers.AuthenticatedUser(userId));

    [Fact]
    public async Task Register_SignsInAndReturnsCreatedAtMe()
    {
        var handler = new Mock<IRegisterUserHandler>();
        handler.Setup(h => h.HandleAsync(It.IsAny<RegisterRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisterResponse { UserId = "u1", DisplayName = "Neo" });

        var result = await Controller(null).Register(null!, handler.Object, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(AuthController.Me), created.ActionName);
    }

    [Fact]
    public async Task Login_SignsInAndReturnsOk()
    {
        var handler = new Mock<ILoginUserHandler>();
        handler.Setup(h => h.HandleAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LoginResponse { UserId = "u1", DisplayName = "Neo" });

        var result = await Controller(null).Login(null!, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Logout_ReturnsNoContent()
    {
        var result = await Controller("u1").Logout();

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Me_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IGetUserProfileHandler>();

        var result = await Controller("u1").Me(handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Me_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).Me(new Mock<IGetUserProfileHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task PatchMe_NullBody_ReturnsBadRequest()
    {
        var result = await Controller("u1").PatchMe(null, new Mock<IPatchUserProfileHandler>().Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PatchMe_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IPatchUserProfileHandler>();

        var result = await Controller("u1").PatchMe(new PatchUserProfileRequest(), handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(
            h => h.HandleAsync("u1", It.IsAny<PatchUserProfileRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PatchMe_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).PatchMe(
            new PatchUserProfileRequest(), new Mock<IPatchUserProfileHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task ChangePassword_NullBody_ReturnsBadRequest()
    {
        var result = await Controller("u1").ChangePassword(null, new Mock<IChangePasswordHandler>().Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IChangePasswordHandler>();

        var result = await Controller("u1").ChangePassword(new ChangePasswordRequest(), handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(
            h => h.HandleAsync("u1", It.IsAny<ChangePasswordRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExportMyData_Authenticated_ReturnsJsonFile()
    {
        var handler = new Mock<IExportUserDataHandler>();
        handler.Setup(h => h.HandleAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserDataExportResponse { ExportedAt = DateTimeOffset.UtcNow });

        var result = await Controller("u1").ExportMyData(handler.Object, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/json", file.ContentType);
        Assert.NotEmpty(file.FileContents);
    }

    [Fact]
    public async Task ExportMyData_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).ExportMyData(new Mock<IExportUserDataHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task DeleteMe_NullBody_ReturnsBadRequest()
    {
        var result = await Controller("u1").DeleteMe(null, new Mock<IDeleteAccountHandler>().Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteMe_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IDeleteAccountHandler>();

        var result = await Controller("u1").DeleteMe(new DeleteAccountRequest(), handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(
            h => h.HandleAsync("u1", It.IsAny<DeleteAccountRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RequestPasswordReset_ReturnsAccepted()
    {
        var handler = new Mock<IRequestPasswordResetHandler>();

        var result = await Controller(null).RequestPasswordReset(null!, handler.Object, CancellationToken.None);

        Assert.IsType<AcceptedResult>(result);
        handler.Verify(
            h => h.HandleAsync(It.IsAny<PasswordResetRequest>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ConfirmPasswordReset_ReturnsOk()
    {
        var handler = new Mock<IConfirmPasswordResetHandler>();

        var result = await Controller(null).ConfirmPasswordReset(null!, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync(It.IsAny<PasswordResetConfirmRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
