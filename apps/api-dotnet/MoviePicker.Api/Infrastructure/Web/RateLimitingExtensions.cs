using System.Globalization;
using System.Security.Claims;
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
    public const string WatchlistReadPolicy = "watchlist-read";
    public const string WatchlistMutationPolicy = "watchlist-mutation";
    public const string LetterboxdImportPolicy = "letterboxd-import";
    public const string KofiWebhookPolicy = "kofi-webhook";
    public const string IdeaSuggestionPolicy = "idea-suggestion";

    private static readonly PolicySpec[] Policies =
    [
        new(CreateEventPolicy, 20, 1, false),
        new(JoinEventPolicy, 60, 1, false),
        new(SearchMoviesPolicy, 40, 1, false),
        new(MovieDetailsPolicy, 120, 1, false),
        new(AuthRegisterPolicy, 10, 1, false),
        new(AuthLoginPolicy, 30, 1, false),
        new(AuthPasswordResetRequestPolicy, 5, 1, false),
        new(AuthPasswordResetConfirmPolicy, 30, 1, false),
        new(AuthChangePasswordPolicy, 10, 1, false),
        new(AuthPatchProfilePolicy, 60, 1, false),
        new(AuthExportDataPolicy, 5, 1, false),
        new(AuthDeleteAccountPolicy, 5, 1, false),
        new(PatchEventConfigPolicy, 40, 1, false),
        new(VoteMutationPolicy, 120, 1, false),
        new(SeenMarksMutationPolicy, 120, 1, false),
        new(NoteMutationPolicy, 60, 1, false),
        new(RemoveParticipantPolicy, 40, 1, false),
        new(DeleteEventPolicy, 10, 1, false),
        new(PostersPolicy, 300, 1, false),
        new(PublicProfilePolicy, 120, 1, false),
        new(FollowMutationPolicy, 60, 1, false),
        new(InviteUserPolicy, 60, 1, false),
        new(WatchlistReadPolicy, 120, 1, false),
        new(WatchlistMutationPolicy, 60, 1, false),
        new(LetterboxdImportPolicy, 10, 1, false),
        new(KofiWebhookPolicy, 20, 1, false),
        new(IdeaSuggestionPolicy, 10, 60, true)
    ];

    public static IServiceCollection AddMoviePickerRateLimiter(
        this IServiceCollection services,
        IHostEnvironment environment)
    {
        var isDevelopment = environment.IsDevelopment();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = WriteRejectedAsync;
            foreach (var spec in Policies)
            {
                var captured = spec;
                if (isDevelopment)
                    options.AddPolicy(captured.Name, _ => RateLimitPartition.GetNoLimiter("dev"));
                else
                    options.AddPolicy(captured.Name, ctx => CreatePartition(ctx, captured));
            }
        });

        return services;
    }

    internal static async ValueTask WriteRejectedAsync(
        OnRejectedContext context,
        CancellationToken cancellationToken)
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
    }

    internal static RateLimitPartition<string> CreatePartition(HttpContext httpContext, PolicySpec spec)
    {
        var key = spec.ByUser ? UserOrIpPartitionKey.Get(httpContext) : ClientIpPartitionKey.Get(httpContext);
        return BuildFixedWindow(key, spec.PermitLimit, spec.WindowMinutes);
    }

    internal static RateLimitPartition<string> BuildFixedWindow(string key, int permitLimit, int windowMinutes) =>
        RateLimitPartition.GetFixedWindowLimiter(
            key,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(windowMinutes),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            });

    internal readonly record struct PolicySpec(string Name, int PermitLimit, int WindowMinutes, bool ByUser);
}

internal static class ClientIpPartitionKey
{
    internal static string Get(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress;
        return ip?.ToString() ?? "unknown";
    }
}

internal static class UserOrIpPartitionKey
{
    internal static string Get(HttpContext httpContext)
    {
        var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userId)
            ? $"ip:{ClientIpPartitionKey.Get(httpContext)}"
            : $"user:{userId}";
    }
}
