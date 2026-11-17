using System.Diagnostics;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class StructuredHttpRequestLoggingMiddleware(
    RequestDelegate next,
    ILogger<StructuredHttpRequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        var failed = false;
        try
        {
            await next(context);
        }
        catch
        {
            failed = true;
            throw;
        }
        finally
        {
            sw.Stop();
            var endpoint = context.GetEndpoint()?.DisplayName;
            var routeKind = ObservabilityRouteKind.ForPath(context.Request.Path);
            logger.LogInformation(
                "HTTP {HttpMethod} {Path}{QueryString} → {StatusCode} en {ElapsedMs} ms ({Endpoint}) [kind={ApiRouteKind}, caller={Caller}]",
                LogText.SingleLine(context.Request.Method),
                LogText.SingleLine(SensitiveQueryRedaction.RedactPath(context.Request.Path.Value)),
                LogText.SingleLine(SensitiveQueryRedaction.RedactQueryString(context.Request.QueryString.Value)),
                failed && !context.Response.HasStarted ? StatusCodes.Status500InternalServerError : context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                endpoint ?? "n/a",
                routeKind,
                context.User.Identity?.IsAuthenticated == true ? "account" : "anonymous");
        }
    }
}
