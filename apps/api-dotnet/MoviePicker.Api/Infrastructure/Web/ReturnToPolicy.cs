namespace MoviePicker.Api.Infrastructure.Web;

public static class ReturnToPolicy
{
    public static string Sanitize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "/";
        var value = raw.Trim();
        if (!value.StartsWith('/') || value.StartsWith("//", StringComparison.Ordinal) || value.StartsWith("/\\", StringComparison.Ordinal))
            return "/";
        return value;
    }
}
