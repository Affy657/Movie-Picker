using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

namespace MoviePicker.Api.Infrastructure.Web;

public static class TwoFactorChallengeCookie
{
    public const string Path = "/";

    public static void Issue(HttpContext context, TwoFactorChallenge challenge, ISecretSealer sealer, DateTimeOffset now) =>
        context.Response.Cookies.Append(
            AuthConstants.TwoFactorChallengeCookieName,
            challenge.Seal(sealer, now),
            Builder(context).Build(context, now));

    public static TwoFactorChallenge? Read(HttpContext context, ISecretSealer sealer) =>
        TwoFactorChallenge.TryOpen(sealer, context.Request.Cookies[AuthConstants.TwoFactorChallengeCookieName]);

    public static void Clear(HttpContext context) =>
        context.Response.Cookies.Delete(AuthConstants.TwoFactorChallengeCookieName, Builder(context).Build(context));

    private static CookieBuilder Builder(HttpContext context) =>
        new()
        {
            Name = AuthConstants.TwoFactorChallengeCookieName,
            HttpOnly = true,
            SecurePolicy = IsDevelopment(context) ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always,
            SameSite = SameSiteMode.Lax,
            Path = Path,
            Expiration = TwoFactorSealing.ChallengeLifetime,
            IsEssential = true
        };

    private static bool IsDevelopment(HttpContext context) =>
        context.RequestServices.GetService<IHostEnvironment>()?.IsDevelopment() == true;
}
