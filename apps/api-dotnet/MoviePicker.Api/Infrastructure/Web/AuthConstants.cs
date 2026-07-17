namespace MoviePicker.Api.Infrastructure.Web;

public static class AuthConstants
{
    public const string CookieName = "moviepicker_auth";

    public static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(30);
}
