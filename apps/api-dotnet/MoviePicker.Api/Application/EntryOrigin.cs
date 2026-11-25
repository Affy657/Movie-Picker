using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application;

public static class EntryOrigin
{
    private const string DeclaredOriginParameter = FrontRoutes.EntryOriginQueryParam + "=";

    private static readonly (string Prefix, string Origin)[] OriginsByReturnPath =
    [
        (FrontRoutes.PrefixOf(FrontRoutes.EventDetailPattern), UsageCount.EventOrigin),
        (FrontRoutes.PrefixOf(FrontRoutes.NightRecapPattern), UsageCount.RecapOrigin),
        (FrontRoutes.PrefixOf(FrontRoutes.ListJoinPattern), UsageCount.ListOrigin),
        (FrontRoutes.PrefixOf(FrontRoutes.ProfilePattern), UsageCount.ProfileOrigin)
    ];

    public static string Of(string? returnTo)
    {
        if (string.IsNullOrEmpty(returnTo) || !returnTo.StartsWith('/') || returnTo.StartsWith("//", StringComparison.Ordinal))
            return UsageCount.OtherOrigin;
        foreach (var (prefix, origin) in OriginsByReturnPath)
        {
            if (returnTo.StartsWith(prefix, StringComparison.Ordinal) && returnTo.Length > prefix.Length)
                return origin;
        }
        return DeclaredOriginOf(returnTo);
    }

    private static string DeclaredOriginOf(string returnTo)
    {
        var queryStart = returnTo.IndexOf('?', StringComparison.Ordinal);
        if (queryStart < 0)
            return UsageCount.OtherOrigin;
        var declared = returnTo[(queryStart + 1)..]
            .Split('&')
            .FirstOrDefault(parameter => parameter.StartsWith(DeclaredOriginParameter, StringComparison.Ordinal))?
            [DeclaredOriginParameter.Length..];
        return UsageCount.IsEntryOrigin(declared) ? declared : UsageCount.OtherOrigin;
    }
}
