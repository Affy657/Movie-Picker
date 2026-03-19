using System.Collections.Generic;

namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>
/// Lit <c>X-Request-Id</c> / <c>X-Correlation-Id</c> ou génère un id, renvoie <c>X-Request-Id</c> et propage dans les logs.
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var id = ResolveCorrelationId(context);
        context.Items[CorrelationIdConstants.ItemKey] = id;
        context.Response.Headers.Append(CorrelationIdConstants.ResponseHeaderName, id);

        using (logger.BeginScope(new Dictionary<string, object> { [CorrelationIdConstants.LoggingScopeKey] = id }))
        {
            await next(context);
        }
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        foreach (var headerName in CorrelationIdConstants.IncomingHeaderNames)
        {
            if (!context.Request.Headers.TryGetValue(headerName, out var values))
                continue;
            var raw = values.FirstOrDefault();
            var normalized = NormalizeIncoming(raw);
            if (normalized is not null)
                return normalized;
        }

        return Guid.NewGuid().ToString("N");
    }

    private static string? NormalizeIncoming(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var v = value.Trim();
        if (v.Length == 0 || v.Length > CorrelationIdConstants.MaxIncomingLength)
            return null;
        // ASCII imprimable uniquement (évite en-têtes / log injection)
        foreach (var c in v)
        {
            if (c < 0x20 || c > 0x7e)
                return null;
        }

        return v;
    }
}
