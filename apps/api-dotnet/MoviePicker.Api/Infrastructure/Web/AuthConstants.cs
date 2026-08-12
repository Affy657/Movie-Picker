namespace MoviePicker.Api.Infrastructure.Web;

public static class AuthConstants
{
    public const string CookieName = "moviepicker_auth";
    public const string ExternalCookieScheme = "ExternalOAuth";
    public const string ExternalCookieName = "moviepicker_oauth_external";

    public static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(30);
    public static readonly TimeSpan ExternalCookieLifetime = TimeSpan.FromMinutes(10);
}
