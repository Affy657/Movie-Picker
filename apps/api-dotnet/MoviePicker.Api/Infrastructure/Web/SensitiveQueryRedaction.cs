using System.Text;
using System.Text.RegularExpressions;

namespace MoviePicker.Api.Infrastructure.Web;

public static partial class SensitiveQueryRedaction
{
    public const string Mask = "***";

    private const string ReturnToKey = "returnTo";

    private static readonly string[] SensitiveKeys = ["token", "host", "api_key", "code", "state"];

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
            if (separator >= 0 && IsSensitive(DecodeQueryComponent(key), pair[(separator + 1)..]))
                builder.Append(key).Append('=').Append(Mask);
            else
                builder.Append(pair);
        }

        return builder.ToString();
    }

    public static string? RedactPath(string? path) =>
        string.IsNullOrEmpty(path) ? path : InviteTokenSegment().Replace(path, "${route}" + Mask);

    public static string? RedactUrl(string? url)
    {
        if (string.IsNullOrEmpty(url))
            return url;

        var questionMark = url.IndexOf('?');
        if (questionMark < 0)
            return RedactPath(url);

        return RedactPath(url[..questionMark]) + RedactQueryString(url[questionMark..]);
    }

    private static bool IsSensitive(string key, string encodedValue) =>
        SensitiveKeys.Any(k => string.Equals(k, key, StringComparison.OrdinalIgnoreCase))
        || (string.Equals(ReturnToKey, key, StringComparison.OrdinalIgnoreCase) && LeadsToASecret(encodedValue));

    private static bool LeadsToASecret(string encodedValue)
    {
        var value = DecodeQueryComponent(encodedValue);
        return !string.Equals(RedactUrl(value), value, StringComparison.Ordinal);
    }

    private static string DecodeQueryComponent(string component) =>
        Uri.UnescapeDataString(component.Replace('+', ' '));

    [GeneratedRegex(
        @"(?<route>/(?:lists|groups)/join/|(?<![^\s""'=:(,<])/[lg]/|(?<=://[^/?#\s""']+)/[lg]/)[^/?#&\s""']+",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex InviteTokenSegment();
}
