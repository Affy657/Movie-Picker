using Microsoft.AspNetCore.HttpOverrides;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class ShareDocumentForwardedHopsLoggingMiddleware(
    RequestDelegate next,
    ILogger<ShareDocumentForwardedHopsLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var receivedForwardedFor = context.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName];
        try
        {
            await next(context);
        }
        finally
        {
            if (RateLimitingExtensions.ShareDocumentPolicyOf(context) is { } policy)
            {
                var hops = FirebaseHostingRelay.GoogleFrontEndHopsOf(receivedForwardedFor);
                logger.LogInformation(
                    "Share document {ShareDocumentPolicy} received {ForwardedHopCount} X-Forwarded-For hops, Google front end per hop [{ForwardedHopsInGoogleFrontEnd}], last hop in it {LastForwardedHopInGoogleFrontEnd}",
                    policy,
                    hops.Count,
                    string.Join(',', hops.Select(inGoogleFrontEnd => inGoogleFrontEnd ? "true" : "false")),
                    hops.Count > 0 && hops[^1]);
            }
        }
    }
}
