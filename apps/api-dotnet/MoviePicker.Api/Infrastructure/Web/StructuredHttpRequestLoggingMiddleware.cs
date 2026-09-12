using System.Diagnostics;

namespace MoviePicker.Api.Infrastructure.Web;

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
                SingleLine(context.Request.Method),
                SingleLine(context.Request.Path.Value),
                SingleLine(context.Request.QueryString.Value),
                context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                endpoint ?? "n/a",
                routeKind);
        }
    }

    private static string SingleLine(string? value) => (value ?? string.Empty).ReplaceLineEndings(" ");
}
