namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>Règles d'origine pour CORS en développement (localhost, etc.).</summary>
public static class CorsOriginRules
{
    /// <summary>localhost / 127.0.0.1 / ::1 sur http ou https (tout port).</summary>
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
