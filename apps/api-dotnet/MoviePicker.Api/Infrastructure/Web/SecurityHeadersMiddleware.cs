using Microsoft.Net.Http.Headers;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private static readonly string[] SharedImagePrefixes =
    [
        "/" + ApiRoutePrefix.V1 + "/posters/",
        "/" + ApiRoutePrefix.V1 + "/banners/",
        "/" + ApiRoutePrefix.V1 + "/avatars/"
    ];

    public Task InvokeAsync(HttpContext context)
    {
        var h = context.Response.Headers;
        if (context.Request.IsHttps)
            h.Append("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
        h.Append("X-Content-Type-Options", "nosniff");
        h.Append("X-Frame-Options", "DENY");
        h.Append("Referrer-Policy", "no-referrer");
        h.Append(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
        h.Append(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        h.Append("Cross-Origin-Opener-Policy", "same-origin");
        h.Append("Cross-Origin-Resource-Policy", IsSharedImage(context.Request.Path) ? "cross-origin" : "same-site");
        h.CacheControl = "no-store";
        context.Response.OnStarting(VaryOnTheOrigin, context.Response);
        return next(context);
    }

    private static bool IsSharedImage(PathString path) =>
        SharedImagePrefixes.Any(prefix => path.Value?.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) == true);

    private static Task VaryOnTheOrigin(object state)
    {
        var headers = ((HttpResponse)state).Headers;
        var varies = headers.Vary.SelectMany(value => (value ?? string.Empty).Split(','))
            .Any(value => value.Trim().Equals(HeaderNames.Origin, StringComparison.OrdinalIgnoreCase));
        if (!varies)
            headers.Append(HeaderNames.Vary, HeaderNames.Origin);
        return Task.CompletedTask;
    }
}
