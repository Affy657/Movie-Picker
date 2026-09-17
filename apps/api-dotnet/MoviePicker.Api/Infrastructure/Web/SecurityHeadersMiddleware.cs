namespace MoviePicker.Api.Infrastructure.Web;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
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
        h.CacheControl = "no-store";
        return next(context);
    }
}
