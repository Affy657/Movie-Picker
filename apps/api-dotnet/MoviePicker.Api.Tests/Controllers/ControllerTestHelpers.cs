using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace MoviePicker.Api.Tests.Controllers;

internal static class ControllerTestHelpers
{
    public static ClaimsPrincipal AuthenticatedUser(string userId, string displayName = "Tester", params Claim[] extraClaims)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Name, displayName),
                .. extraClaims
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    public static TController WithContext<TController>(
        this TController controller,
        ClaimsPrincipal? user = null,
        IAuthenticationService? authentication = null)
        where TController : ControllerBase
    {
        var services = new ServiceCollection();
        services.AddSingleton(authentication ?? new Mock<IAuthenticationService>().Object);

        var httpContext = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider(),
            User = user ?? new ClaimsPrincipal(new ClaimsIdentity())
        };
        httpContext.Response.Body = new MemoryStream();

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }
}
