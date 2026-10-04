namespace MoviePicker.Api.Infrastructure.Web;

public static class AuthSessionKey
{
    private const string ItemKey = "mp:auth-session-key";

    public static void Remember(HttpContext httpContext, string key) => httpContext.Items[ItemKey] = key;

    public static string? Of(HttpContext httpContext) =>
        httpContext.Items.TryGetValue(ItemKey, out var key) ? key as string : null;
}
