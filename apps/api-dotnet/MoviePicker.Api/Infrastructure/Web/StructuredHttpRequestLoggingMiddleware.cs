using System.Diagnostics;

namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>
/// Journalise chaque requête avec durée et statut (propriétés structurées → JSON en prod via JsonConsole).
/// </summary>
public sealed class StructuredHttpRequestLoggingMiddleware(
    RequestDelegate next,
    ILogger<StructuredHttpRequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await next(context);
        }
        finally
        {
            sw.Stop();
            var endpoint = context.GetEndpoint()?.DisplayName;
            var routeKind = ObservabilityRouteKind.ForPath(context.Request.Path);
            logger.LogInformation(
                "HTTP {HttpMethod} {Path}{QueryString} → {StatusCode} en {ElapsedMs} ms ({Endpoint}) [kind={ApiRouteKind}]",
                context.Request.Method,
                context.Request.Path.Value,
                context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                endpoint ?? "n/a",
                routeKind);
        }
    }
}
