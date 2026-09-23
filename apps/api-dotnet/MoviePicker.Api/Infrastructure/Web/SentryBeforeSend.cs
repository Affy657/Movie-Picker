using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Sentry;

namespace MoviePicker.Api.Infrastructure.Web;

internal static partial class SentryBeforeSend
{
    internal static SentryEvent? Prepare(SentryEvent sentryEvent)
    {
        sentryEvent.User = new SentryUser();
        sentryEvent.Request.Url = SensitiveQueryRedaction.RedactUrl(sentryEvent.Request.Url);
        sentryEvent.Request.QueryString = SensitiveQueryRedaction.RedactQueryString(sentryEvent.Request.QueryString);
        DropLoggedValues(sentryEvent);
        return IsAuthenticationNoise(sentryEvent) ? null : sentryEvent;
    }

    internal static bool IsLogNoise(string category, LogLevel level, EventId eventId, Exception? exception) =>
        string.Equals(category, typeof(MongoDatabaseHealthProbe).FullName, StringComparison.Ordinal);

    private static void DropLoggedValues(SentryEvent sentryEvent)
    {
        if (sentryEvent.Message?.Message is not { Length: > 0 } template)
            return;

        foreach (Match placeholder in LogPlaceholder().Matches(template))
            sentryEvent.UnsetTag(placeholder.Groups["name"].Value);

        sentryEvent.Message = new SentryMessage { Message = template, Formatted = template };
    }

    [GeneratedRegex(@"\{(?<name>@?[A-Za-z0-9_]+)(?:[,:][^}]*)?\}", RegexOptions.CultureInvariant)]
    private static partial Regex LogPlaceholder();

    internal static Breadcrumb? RedactBreadcrumb(Breadcrumb breadcrumb, SentryHint hint)
    {
        if (breadcrumb.Data is null || !breadcrumb.Data.TryGetValue("url", out var url))
            return breadcrumb;

        var redactedUrl = SensitiveQueryRedaction.RedactUrl(url);
        if (string.Equals(redactedUrl, url, StringComparison.Ordinal))
            return breadcrumb;

        var data = new Dictionary<string, string>(breadcrumb.Data) { ["url"] = redactedUrl! };
        var message = breadcrumb.Message?.Replace(url, redactedUrl, StringComparison.Ordinal) ?? string.Empty;
        return new Breadcrumb(message, breadcrumb.Type ?? "default", data, breadcrumb.Category, breadcrumb.Level);
    }

    internal static double SampleTrace(string? transactionName)
    {
        if (string.IsNullOrEmpty(transactionName))
            return 0.1;
        if (transactionName.Contains("/health", StringComparison.OrdinalIgnoreCase))
            return 0;
        if (transactionName is "GET /.env" or "GET /*" or "GET /fetch")
            return 0;
        return 0.1;
    }

    internal static bool IsAuthenticationNoise(SentryEvent sentryEvent)
    {
        for (var ex = sentryEvent.Exception; ex is not null; ex = ex.InnerException)
        {
            if (ex is AuthenticationFailureException)
                return true;
            if (ContainsOAuthStateNoise(ex.Message))
                return true;
        }

        if (sentryEvent.SentryExceptions is null)
            return false;

        foreach (var item in sentryEvent.SentryExceptions)
        {
            if (item.Type?.Contains("AuthenticationFailureException", StringComparison.Ordinal) == true)
                return true;
            if (ContainsOAuthStateNoise(item.Value))
                return true;
        }

        return false;
    }

    private static bool ContainsOAuthStateNoise(string? text) =>
        text is not null && text.Contains("oauth state", StringComparison.OrdinalIgnoreCase);
}
