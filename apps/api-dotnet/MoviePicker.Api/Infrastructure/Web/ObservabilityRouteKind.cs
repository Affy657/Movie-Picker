namespace MoviePicker.Api.Infrastructure.Web;

internal static class ObservabilityRouteKind
{
    internal const string Auth = "auth";
    internal const string EventConfig = "event-config";
    internal const string Other = "other";

    internal static string ForPath(PathString path)
    {
        var v = path.Value;
        if (string.IsNullOrEmpty(v))
            return Other;

        if (v.StartsWith("/api/v1/auth", StringComparison.Ordinal))
            return Auth;

        if (v.StartsWith("/api/v1/events/", StringComparison.Ordinal)
            && v.Contains("/config", StringComparison.Ordinal))
            return EventConfig;

        return Other;
    }
}
