namespace MoviePicker.Api.Infrastructure.Web;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        var h = context.Response.Headers;
        h.Append("X-Content-Type-Options", "nosniff");
        h.Append("X-Frame-Options", "DENY");
        h.Append("Referrer-Policy", "no-referrer");
        h.Append(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
        h.Append(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        return next(context);
    }
}
