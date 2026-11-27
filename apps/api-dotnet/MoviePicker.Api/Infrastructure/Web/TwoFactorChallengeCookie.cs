using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

namespace MoviePicker.Api.Infrastructure.Web;

public static class TwoFactorChallengeCookie
{
    public const string Path = "/" + ApiRoutePrefix.V1 + "/auth";

    public static void Issue(HttpContext context, TwoFactorChallenge challenge, ISecretSealer sealer, DateTimeOffset now) =>
        context.Response.Cookies.Append(
            AuthConstants.TwoFactorChallengeCookieName,
            challenge.Seal(sealer, now),
            Options(context, now + TwoFactorSealing.ChallengeLifetime));

    public static TwoFactorChallenge? Read(HttpContext context, ISecretSealer sealer) =>
        TwoFactorChallenge.TryOpen(sealer, context.Request.Cookies[AuthConstants.TwoFactorChallengeCookieName]);

    public static void Clear(HttpContext context) =>
        context.Response.Cookies.Delete(AuthConstants.TwoFactorChallengeCookieName, Options(context, null));

    private static CookieOptions Options(HttpContext context, DateTimeOffset? expires) =>
        new()
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps || !IsDevelopment(context),
            SameSite = SameSiteMode.Lax,
            Path = Path,
            Expires = expires,
            IsEssential = true
        };

    private static bool IsDevelopment(HttpContext context) =>
        context.RequestServices.GetService<IHostEnvironment>()?.IsDevelopment() == true;
}
