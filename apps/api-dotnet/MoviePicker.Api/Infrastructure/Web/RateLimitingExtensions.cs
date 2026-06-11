using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace MoviePicker.Api.Infrastructure.Web;

public static class RateLimitingExtensions
{
    public const string CreateEventPolicy = "create-event";
    public const string JoinEventPolicy = "join-event";
    public const string SearchMoviesPolicy = "search-movies";
    public const string MovieDetailsPolicy = "movie-details";
    public const string AuthRegisterPolicy = "auth-register";
    public const string AuthLoginPolicy = "auth-login";
    public const string AuthPasswordResetRequestPolicy = "auth-password-reset-request";
    public const string AuthPasswordResetConfirmPolicy = "auth-password-reset-confirm";
    public const string AuthChangePasswordPolicy = "auth-change-password";
    public const string AuthPatchProfilePolicy = "auth-patch-profile";
    public const string AuthExportDataPolicy = "auth-export-data";
    public const string AuthDeleteAccountPolicy = "auth-delete-account";
    public const string PatchEventConfigPolicy = "patch-event-config";
    public const string VoteMutationPolicy = "vote-mutation";
    public const string SeenMarksMutationPolicy = "seen-marks-mutation";
    public const string NoteMutationPolicy = "note-mutation";
    public const string RemoveParticipantPolicy = "remove-participant";
    public const string DeleteEventPolicy = "delete-event";
    public const string PostersPolicy = "posters-get";
    public const string PublicProfilePolicy = "public-profile";
    public const string FollowMutationPolicy = "follow-mutation";
    public const string InviteUserPolicy = "invite-user";

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
                options.AddPolicy(MovieDetailsPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthRegisterPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthLoginPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthPasswordResetRequestPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthPasswordResetConfirmPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthChangePasswordPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthPatchProfilePolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthExportDataPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(AuthDeleteAccountPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(PatchEventConfigPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(VoteMutationPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(SeenMarksMutationPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(NoteMutationPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(RemoveParticipantPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(DeleteEventPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(PostersPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(PublicProfilePolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(FollowMutationPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(InviteUserPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                return;
            }

            options.AddPolicy(CreateEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 20, windowMinutes: 1));
            options.AddPolicy(JoinEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
            options.AddPolicy(SearchMoviesPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
            options.AddPolicy(MovieDetailsPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            options.AddPolicy(AuthRegisterPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 10, windowMinutes: 1));
            options.AddPolicy(AuthLoginPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 30, windowMinutes: 1));
            options.AddPolicy(AuthPasswordResetRequestPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 5, windowMinutes: 1));
            options.AddPolicy(AuthPasswordResetConfirmPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 30, windowMinutes: 1));
            options.AddPolicy(AuthChangePasswordPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 10, windowMinutes: 1));
            options.AddPolicy(AuthPatchProfilePolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
            options.AddPolicy(AuthExportDataPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 5, windowMinutes: 1));
            options.AddPolicy(AuthDeleteAccountPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 5, windowMinutes: 1));
            options.AddPolicy(PatchEventConfigPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
            options.AddPolicy(VoteMutationPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            options.AddPolicy(SeenMarksMutationPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            options.AddPolicy(NoteMutationPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
            options.AddPolicy(RemoveParticipantPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
            options.AddPolicy(DeleteEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 10, windowMinutes: 1));
            options.AddPolicy(PostersPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 300, windowMinutes: 1));
            options.AddPolicy(PublicProfilePolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            options.AddPolicy(FollowMutationPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
            options.AddPolicy(InviteUserPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
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

internal static class ClientIpPartitionKey
{
    internal static string Get(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress;
        return ip?.ToString() ?? "unknown";
    }
}
