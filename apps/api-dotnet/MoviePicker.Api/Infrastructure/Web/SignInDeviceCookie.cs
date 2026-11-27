using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using MoviePicker.Api.Application.UseCases.Auth.SignInDevices;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Web;

public static class SignInDeviceCookie
{
    public const string Name = "moviepicker_device";
    public const string ClaimType = "mp:device";
    public const string MethodItemKey = "mp:sign-in-method";
    public static readonly string Scope = string.Join('/', "", ApiRoutePrefix.V1, "auth");

    public static void RememberMethod(AuthenticationProperties properties, string method) =>
        properties.Items[MethodItemKey] = method;

    public static async Task OnSigningInAsync(CookieSigningInContext context)
    {
        var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return;

        var http = context.HttpContext;
        context.Properties.Items.Remove(MethodItemKey, out var method);
        var userAgent = http.Request.Headers.UserAgent.ToString();
        var device = await http.RequestServices.GetRequiredService<ISignInDeviceHandler>().HandleAsync(
            new SignInDeviceRequest(
                userId,
                http.Request.Cookies[Name],
                string.IsNullOrWhiteSpace(userAgent) ? null : userAgent,
                method,
                RequestLanguageModelBinder.LanguageOf(http.Request)),
            http.RequestAborted);

        if (device.DeviceId.Length > 0 && context.Principal!.Identity is ClaimsIdentity identity)
            identity.AddClaim(new Claim(ClaimType, device.DeviceId));

        var cookie = new CookieBuilder
        {
            Name = Name,
            HttpOnly = true,
            SecurePolicy = context.Options.Cookie.SecurePolicy,
            SameSite = SameSiteMode.Lax,
            Path = Scope,
            MaxAge = KnownDevice.Retention,
            IsEssential = true
        };
        http.Response.Cookies.Append(Name, device.Token, cookie.Build(http));
    }
}
