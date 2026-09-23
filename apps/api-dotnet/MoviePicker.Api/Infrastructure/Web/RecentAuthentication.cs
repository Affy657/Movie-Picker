using System.Globalization;
using System.Security.Claims;

namespace MoviePicker.Api.Infrastructure.Web;

public static class RecentAuthentication
{
    public const string AuthenticatedAtClaimType = "mp:authenticated_at";

    public static readonly TimeSpan Window = TimeSpan.FromMinutes(10);

    public static Claim ClaimFor(DateTimeOffset authenticatedAt) =>
        new(AuthenticatedAtClaimType, authenticatedAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture));

    public static bool IsRecent(ClaimsPrincipal? principal, DateTimeOffset now)
    {
        var raw = principal?.FindFirst(AuthenticatedAtClaimType)?.Value;
        if (!long.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var authenticatedAt))
            return false;
        return now.ToUnixTimeSeconds() - authenticatedAt <= (long)Window.TotalSeconds;
    }
}
