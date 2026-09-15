using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;

namespace MoviePicker.Api.Infrastructure.Web;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal user, [NotNullWhen(true)] out string? userId)
    {
        userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return !string.IsNullOrEmpty(userId);
    }
}
