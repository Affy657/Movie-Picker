using Microsoft.AspNetCore.Authentication;
using Sentry;

namespace MoviePicker.Api.Infrastructure.Web;

internal static class SentryBeforeSend
{
    internal static SentryEvent? Prepare(SentryEvent sentryEvent)
    {
        sentryEvent.User = new SentryUser();
        return IsAuthenticationNoise(sentryEvent) ? null : sentryEvent;
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
