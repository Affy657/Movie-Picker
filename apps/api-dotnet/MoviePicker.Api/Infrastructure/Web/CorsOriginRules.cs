namespace MoviePicker.Api.Infrastructure.Web;

public static class CorsOriginRules
{
    public static bool IsLocalDevelopmentOrigin(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            return false;

        if (uri.Scheme is not ("http" or "https"))
            return false;

        return uri.IdnHost.Equals("localhost", StringComparison.OrdinalIgnoreCase)
               || uri.IdnHost == "127.0.0.1"
               || uri.IdnHost == "[::1]"
               || uri.IdnHost == "::1";
    }
}
