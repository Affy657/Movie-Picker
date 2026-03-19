using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>
/// Limites par IP (clé = partition) sur création d'event, join et recherche TMDB.
/// </summary>
public static class RateLimitingExtensions
{
    public const string CreateEventPolicy = "create-event";
    public const string JoinEventPolicy = "join-event";
    public const string SearchMoviesPolicy = "search-movies";

    public static IServiceCollection AddMoviePickerRateLimiter(this IServiceCollection services, IHostEnvironment environment)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
                    context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                }

                context.HttpContext.Response.ContentType = "application/json";
                var json = ApiErrorJson.Serialize(
                    context.HttpContext,
                    StatusCodes.Status429TooManyRequests,
                    "Trop de requêtes. Réessayez dans un instant.");
                await context.HttpContext.Response.WriteAsync(json, cancellationToken);
            };

            if (environment.IsDevelopment())
            {
                options.AddPolicy(CreateEventPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(JoinEventPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(SearchMoviesPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                return;
            }

            options.AddPolicy(CreateEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 20, windowMinutes: 1));
            options.AddPolicy(JoinEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
            options.AddPolicy(SearchMoviesPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
        });

        return services;
    }

    private static RateLimitPartition<string> CreateFixedWindow(HttpContext httpContext, int permitLimit, int windowMinutes)
    {
        var key = ClientIpPartitionKey.Get(httpContext);
        return RateLimitPartition.GetFixedWindowLimiter(
            key,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(windowMinutes),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            });
    }
}

/// <summary>Clé de partition pour le rate limiting (IP client, derrière proxy si ForwardedHeaders est activé).</summary>
internal static class ClientIpPartitionKey
{
    internal static string Get(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress;
        return ip?.ToString() ?? "unknown";
    }
}
