using System.Text;

namespace MoviePicker.Api.Infrastructure.Web;

public static class SensitiveQueryRedaction
{
    public const string Mask = "***";

    private static readonly string[] SensitiveKeys = ["host", "token", "api_key"];

    public static string RedactQueryString(string? queryString)
    {
        if (string.IsNullOrEmpty(queryString))
            return string.Empty;

        var hasLeadingQuestionMark = queryString[0] == '?';
        var body = hasLeadingQuestionMark ? queryString[1..] : queryString;
        if (body.Length == 0)
            return queryString;

        var builder = new StringBuilder(queryString.Length);
        if (hasLeadingQuestionMark)
            builder.Append('?');

        var first = true;
        foreach (var pair in body.Split('&'))
        {
            if (!first)
                builder.Append('&');
            first = false;

            var separator = pair.IndexOf('=');
            var key = separator < 0 ? pair : pair[..separator];
            if (separator >= 0 && IsSensitive(key))
                builder.Append(key).Append('=').Append(Mask);
            else
                builder.Append(pair);
        }

        return builder.ToString();
    }

    public static string? RedactUrl(string? url)
    {
        if (string.IsNullOrEmpty(url))
            return url;

        var questionMark = url.IndexOf('?');
        if (questionMark < 0)
            return url;

        return url[..questionMark] + RedactQueryString(url[questionMark..]);
    }

    private static bool IsSensitive(string key) =>
        SensitiveKeys.Any(k => string.Equals(k, key, StringComparison.OrdinalIgnoreCase));
}
