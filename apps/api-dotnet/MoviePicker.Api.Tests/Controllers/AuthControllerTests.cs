using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class AuthControllerTests
{
    private const string WebBase = "https://www.example.test";

    private static readonly DateTimeOffset Now = new(2026, 9, 23, 20, 0, 0, TimeSpan.Zero);

    private static readonly TimeProvider Clock = new FixedClock(Now);

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static AuthController Controller(string? userId) =>
        new AuthController().WithContext(
            userId is null ? null : ControllerTestHelpers.AuthenticatedUser(userId));

    private static AuthController SessionController(DateTimeOffset signedInAt, IAuthenticationService? authentication = null) =>
        new AuthController().WithContext(
            ControllerTestHelpers.AuthenticatedUser("u1", "Tester", RecentAuthentication.ClaimFor(signedInAt)),
            authentication);

    private static OAuthProviderCatalog GoogleEnabled() =>
        new(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OAUTH_GOOGLE_CLIENT_ID"] = "client-id",
                ["OAUTH_GOOGLE_CLIENT_SECRET"] = "client-secret"
            })
            .Build());

    private static IOptions<MoviePickerOptions> Options() =>
        Microsoft.Extensions.Options.Options.Create(new MoviePickerOptions { PublicWebBaseUrl = WebBase });

    private static Mock<IAuthenticationService> ExternalSignIn()
    {
        var authentication = new Mock<IAuthenticationService>();
        var external = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "google-subject")],
            AuthConstants.ExternalCookieScheme));
        authentication
            .Setup(a => a.AuthenticateAsync(It.IsAny<HttpContext>(), AuthConstants.ExternalCookieScheme))
            .ReturnsAsync(AuthenticateResult.Success(
                new AuthenticationTicket(external, AuthConstants.ExternalCookieScheme)));
        return authentication;
    }

    private static Mock<IOAuthLinkHandler> LinkHandler(OAuthOutcomeKind outcome)
    {
        var handler = new Mock<IOAuthLinkHandler>();
        handler
            .Setup(h => h.HandleAsync("u1", It.IsAny<ExternalLoginInfo>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OAuthOutcome { Kind = outcome });
        return handler;
    }

    private static Task<IActionResult> Callback(AuthController controller, IOAuthLinkHandler linkHandler) =>
        controller.OAuthCallback(
            "google",
            new Mock<IOAuthLoginHandler>().Object,
            linkHandler,
            GoogleEnabled(),
            Options(),
            Clock,
            CancellationToken.None);

    [Fact]
    public async Task Register_SignsInAndReturnsCreatedAtMe()
    {
        var handler = new Mock<IRegisterUserHandler>();
        handler.Setup(h => h.HandleAsync(It.IsAny<RegisterRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisterResponse { UserId = "u1", DisplayName = "Neo" });

        var result = await Controller(null).Register(null!, handler.Object, Clock, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(AuthController.Me), created.ActionName);
    }

    [Fact]
    public async Task Login_SignsInAndReturnsOk()
    {
        var handler = new Mock<ILoginUserHandler>();
        handler.Setup(h => h.HandleAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LoginResponse { UserId = "u1", DisplayName = "Neo" });

        var result = await Controller(null).Login(null!, handler.Object, Clock, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Login_CarriesTheSignInTimeInTheSessionClaims()
    {
        var handler = new Mock<ILoginUserHandler>();
        handler.Setup(h => h.HandleAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LoginResponse { UserId = "u1", DisplayName = "Neo" });
        var authentication = new Mock<IAuthenticationService>();
        ClaimsPrincipal? signedIn = null;
        authentication
            .Setup(a => a.SignInAsync(
                It.IsAny<HttpContext>(),
                CookieAuthenticationDefaults.AuthenticationScheme,
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<AuthenticationProperties?>()))
            .Callback<HttpContext, string?, ClaimsPrincipal, AuthenticationProperties?>((_, _, principal, _) => signedIn = principal)
            .Returns(Task.CompletedTask);
        var controller = new AuthController().WithContext(authentication: authentication.Object);

        await controller.Login(null!, handler.Object, Clock, CancellationToken.None);

        Assert.NotNull(signedIn);
        Assert.True(RecentAuthentication.IsRecent(signedIn, Now + RecentAuthentication.Window));
        Assert.False(RecentAuthentication.IsRecent(signedIn, Now + RecentAuthentication.Window + TimeSpan.FromSeconds(1)));
    }

    [Fact]
    public async Task Logout_ReturnsNoContent()
    {
        var handler = new Mock<ILogoutHandler>();

        var result = await Controller("u1").Logout(
            new LogoutRequest { PushEndpoint = "https://fcm.googleapis.com/fcm/send/abc" },
            handler.Object);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", "https://fcm.googleapis.com/fcm/send/abc", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Logout_SignsOutFirstThenForgetsTheDeviceWithoutTheRequestToken()
    {
        var steps = new List<string>();
        var authentication = new Mock<IAuthenticationService>();
        authentication
            .Setup(a => a.SignOutAsync(It.IsAny<HttpContext>(), It.IsAny<string?>(), It.IsAny<AuthenticationProperties?>()))
            .Callback(() => steps.Add("sign-out"))
            .Returns(Task.CompletedTask);
        var handler = new Mock<ILogoutHandler>();
        CancellationToken cleanupToken = default;
        handler
            .Setup(h => h.HandleAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .Callback<string?, string?, CancellationToken>((_, _, token) =>
            {
                steps.Add("forget-device");
                cleanupToken = token;
            })
            .Returns(Task.CompletedTask);
        var controller = new AuthController
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    RequestServices = new ServiceCollection().AddSingleton(authentication.Object).BuildServiceProvider(),
                    User = ControllerTestHelpers.AuthenticatedUser("u1")
                }
            }
        };

        var result = await controller.Logout(
            new LogoutRequest { PushEndpoint = "https://fcm.googleapis.com/fcm/send/abc" },
            handler.Object);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(["sign-out", "forget-device"], steps);
        Assert.Equal(CancellationToken.None, cleanupToken);
    }

    [Fact]
    public void OAuthStart_Anonymous_ChallengesTheProvider()
    {
        var result = Controller(null).OAuthStart("google", "/settings/integrations", GoogleEnabled(), Options(), Clock);

        var challenge = Assert.IsType<ChallengeResult>(result);
        Assert.Equal(["google"], challenge.AuthenticationSchemes);
    }

    [Fact]
    public void OAuthStart_RecentSession_ChallengesTheProvider()
    {
        var result = SessionController(Now.AddMinutes(-2))
            .OAuthStart("google", "/settings/integrations", GoogleEnabled(), Options(), Clock);

        Assert.IsType<ChallengeResult>(result);
    }

    [Fact]
    public void OAuthStart_StaleSession_SendsBackToTheIntegrationsPage()
    {
        var result = SessionController(Now - RecentAuthentication.Window - TimeSpan.FromMinutes(1))
            .OAuthStart("google", "/settings/integrations", GoogleEnabled(), Options(), Clock);

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal($"{WebBase}/settings/integrations?oauthError=reauthentication_required", redirect.Url);
    }

    [Fact]
    public void OAuthStart_SessionWithoutSignInTime_SendsBackToTheIntegrationsPage()
    {
        var result = Controller("u1").OAuthStart("google", "/settings/integrations", GoogleEnabled(), Options(), Clock);

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal($"{WebBase}/settings/integrations?oauthError=reauthentication_required", redirect.Url);
    }

    [Fact]
    public async Task OAuthCallback_StaleSession_RefusesTheLink()
    {
        var linkHandler = LinkHandler(OAuthOutcomeKind.Linked);
        var controller = SessionController(Now - RecentAuthentication.Window - TimeSpan.FromMinutes(1), ExternalSignIn().Object);

        var result = await Callback(controller, linkHandler.Object);

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal($"{WebBase}/settings/integrations?oauthError=reauthentication_required", redirect.Url);
        linkHandler.Verify(
            h => h.HandleAsync(It.IsAny<string>(), It.IsAny<ExternalLoginInfo>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData(OAuthOutcomeKind.Linked, "oauthLinked=google")]
    [InlineData(OAuthOutcomeKind.ProviderAlreadyLinked, "oauthError=provider_already_linked")]
    [InlineData(OAuthOutcomeKind.IdentityLinkedToOtherAccount, "oauthError=identity_taken")]
    public async Task OAuthCallback_RecentSession_ReportsTheLinkOutcomeOnTheIntegrationsPage(OAuthOutcomeKind outcome, string expectedQuery)
    {
        var controller = SessionController(Now.AddMinutes(-2), ExternalSignIn().Object);

        var result = await Callback(controller, LinkHandler(outcome).Object);

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal($"{WebBase}/settings/integrations?{expectedQuery}", redirect.Url);
    }

    private static Task<IActionResult> SignInCallback(IOAuthLoginHandler loginHandler) =>
        new AuthController().WithContext(authentication: ExternalSignIn().Object).OAuthCallback(
            "google",
            loginHandler,
            new Mock<IOAuthLinkHandler>().Object,
            GoogleEnabled(),
            Options(),
            Clock,
            CancellationToken.None);

    [Fact]
    public async Task OAuthCallback_IdentityTheUserUnlinked_SendsBackToTheLoginPageAskingForAManualLink()
    {
        var loginHandler = new Mock<IOAuthLoginHandler>();
        loginHandler
            .Setup(h => h.HandleAsync(It.IsAny<ExternalLoginInfo>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OAuthOutcome { Kind = OAuthOutcomeKind.UnlinkedIdentityRequiresManualLink });

        var result = await SignInCallback(loginHandler.Object);

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal($"{WebBase}/login?oauthError=account_exists&returnTo=%2F", redirect.Url);
    }

    [Fact]
    public async Task UnlinkIdentity_KeepsTheSessionTheRequestIsSignedInWith()
    {
        var handler = new Mock<IOAuthUnlinkHandler>();
        var controller = Controller("u1");
        AuthSessionKey.Remember(controller.HttpContext, "session-1");

        var result = await controller.UnlinkIdentity("github", handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", "github", "session-1", It.IsAny<CancellationToken>()), Times.Once);
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
        var result = await Controller("u1").ChangePassword(null, new Mock<IChangePasswordHandler>().Object, Clock, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IChangePasswordHandler>();

        var result = await Controller("u1").ChangePassword(new ChangePasswordRequest(), handler.Object, Clock, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(
            h => h.HandleAsync("u1", It.IsAny<ChangePasswordRequest>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(2, true)]
    [InlineData(11, false)]
    public async Task ChangePassword_TellsTheHandlerWhetherTheSignInIsRecent(int minutesSinceSignIn, bool expectedRecent)
    {
        var handler = new Mock<IChangePasswordHandler>();

        await SessionController(Now.AddMinutes(-minutesSinceSignIn))
            .ChangePassword(new ChangePasswordRequest(), handler.Object, Clock, CancellationToken.None);

        handler.Verify(
            h => h.HandleAsync("u1", It.IsAny<ChangePasswordRequest>(), expectedRecent, It.IsAny<CancellationToken>()), Times.Once);
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
