using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

public static class RateLimitingExtensions
{
    public const string CreateEventPolicy = "create-event";
    public const string JoinEventPolicy = "join-event";
    public const string SearchMoviesPolicy = "search-movies";
    public const string MovieDetailsPolicy = "movie-details";
    public const string MovieShowcasePolicy = "movie-showcase";
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
    public const string RatingMutationPolicy = "rating-mutation";
    public const string RemoveParticipantPolicy = "remove-participant";
    public const string DeleteEventPolicy = "delete-event";
    public const string PostersPolicy = "posters-get";
    public const string PublicProfilePolicy = "public-profile";
    public const string SearchUsersPolicy = "search-users";
    public const string FollowMutationPolicy = "follow-mutation";
    public const string InviteUserPolicy = "invite-user";
    public const string WatchlistReadPolicy = "watchlist-read";
    public const string WatchlistMutationPolicy = "watchlist-mutation";
    public const string LetterboxdImportPolicy = "letterboxd-import";
    public const string KofiWebhookPolicy = "kofi-webhook";
    public const string IdeaSuggestionPolicy = "idea-suggestion";
    public const string SchedulerPolicy = "scheduler";
    public const string HostActionPolicy = "host-action";
    public const string MovieMutationPolicy = "movie-mutation";
    public const string NotificationMutationPolicy = "notification-mutation";
    public const string AuthLogoutPolicy = "auth-logout";
    public const string HealthReadyPolicy = "health-ready";
    public const string EventViewPollPolicy = "event-view-poll";
    public const string RecapDocumentPolicy = "recap-document";
    public const string AvatarPhotoUploadPolicy = "avatar-photo-upload";
    public const string AvatarPhotosPolicy = "avatar-photos-get";

    private const string ProxiedPartition = "proxied";

    public const int GlobalPermitLimitPerMinute = 900;

    public const int AddressCeilingPerMinute = 1_800;

    private static readonly PolicySpec[] Policies =
    [
        new(CreateEventPolicy, 20, 1),
        new(JoinEventPolicy, 60, 1),
        new(SearchMoviesPolicy, 40, 1),
        new(MovieDetailsPolicy, 120, 1),
        new(MovieShowcasePolicy, 240, 1),
        new(AuthRegisterPolicy, 10, 1, QuotaScope.Address),
        new(AuthLoginPolicy, 30, 1, QuotaScope.Address),
        new(AuthPasswordResetRequestPolicy, 5, 1, QuotaScope.Address),
        new(AuthPasswordResetConfirmPolicy, 30, 1, QuotaScope.Address),
        new(AuthChangePasswordPolicy, 10, 1),
        new(AuthPatchProfilePolicy, 60, 1),
        new(AuthExportDataPolicy, 5, 1),
        new(AuthDeleteAccountPolicy, 5, 1),
        new(PatchEventConfigPolicy, 40, 1),
        new(VoteMutationPolicy, 120, 1),
        new(SeenMarksMutationPolicy, 120, 1),
        new(NoteMutationPolicy, 60, 1),
        new(RemoveParticipantPolicy, 40, 1),
        new(DeleteEventPolicy, 10, 1),
        new(PostersPolicy, 300, 1),
        new(PublicProfilePolicy, 120, 1),
        new(SearchUsersPolicy, 40, 1),
        new(FollowMutationPolicy, 60, 1),
        new(InviteUserPolicy, 60, 1),
        new(WatchlistReadPolicy, 120, 1),
        new(WatchlistMutationPolicy, 60, 1),
        new(LetterboxdImportPolicy, 10, 1),
        new(KofiWebhookPolicy, 20, 1, QuotaScope.Address),
        new(IdeaSuggestionPolicy, 10, 60),
        new(SchedulerPolicy, 10, 1, QuotaScope.Address),
        new(HostActionPolicy, 60, 1),
        new(MovieMutationPolicy, 60, 1),
        new(NotificationMutationPolicy, 60, 1),
        new(AuthLogoutPolicy, 30, 1),
        new(HealthReadyPolicy, 30, 1, QuotaScope.Address),
        new(EventViewPollPolicy, 600, 1),
        new(RatingMutationPolicy, 60, 1),
        new(RecapDocumentPolicy, 120, 1, QuotaScope.Slug),
        new(AvatarPhotoUploadPolicy, 10, 60),
        new(AvatarPhotosPolicy, 300, 1)
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
            if (!isDevelopment)
                options.GlobalLimiter = CreateGlobalLimiter();
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
            "Too many requests, please retry in a moment",
            ErrorCodes.RateLimited);
        await context.HttpContext.Response.WriteAsync(json, cancellationToken);
    }

    internal static PolicySpec? FindPolicy(string name)
    {
        foreach (var spec in Policies)
        {
            if (string.Equals(spec.Name, name, StringComparison.Ordinal))
                return spec;
        }
        return null;
    }

    internal static string PartitionKeyFor(HttpContext httpContext) => UserOrIpPartitionKey.Get(httpContext);

    internal static string PartitionKeyFor(HttpContext httpContext, PolicySpec spec) => spec.Scope switch
    {
        QuotaScope.Address => AddressPartitionKey(httpContext),
        QuotaScope.Slug => RouteSlugPartitionKey.Get(httpContext) ?? AddressPartitionKey(httpContext),
        _ => PartitionKeyFor(httpContext)
    };

    private static string AddressPartitionKey(HttpContext httpContext) => $"ip:{ClientIpPartitionKey.Get(httpContext)}";

    internal static PartitionedRateLimiter<HttpContext> CreateGlobalLimiter() =>
        PartitionedRateLimiter.CreateChained(
            PartitionedRateLimiter.Create<HttpContext, string>(CreateAddressCeilingPartition),
            PartitionedRateLimiter.Create<HttpContext, string>(CreateGlobalPartition));

    internal static RateLimitPartition<string> CreateAddressCeilingPartition(HttpContext httpContext) =>
        IsProxied(httpContext)
            ? RateLimitPartition.GetNoLimiter(ProxiedPartition)
            : BuildFixedWindow(AddressPartitionKey(httpContext), AddressCeilingPerMinute, 1);

    internal static RateLimitPartition<string> CreateGlobalPartition(HttpContext httpContext)
    {
        if (IsPolledEventView(httpContext))
            return RateLimitPartition.GetNoLimiter(EventViewPollPolicy);
        return IsProxied(httpContext)
            ? RateLimitPartition.GetNoLimiter(ProxiedPartition)
            : BuildFixedWindow(PartitionKeyFor(httpContext), GlobalPermitLimitPerMinute, 1);
    }

    private static string? PolicyNameOf(HttpContext httpContext) =>
        httpContext.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName;

    private static bool IsPolledEventView(HttpContext httpContext) => PolicyNameOf(httpContext) == EventViewPollPolicy;

    private static bool IsProxied(HttpContext httpContext) =>
        PolicyNameOf(httpContext) is { } policyName && FindPolicy(policyName) is { Scope: QuotaScope.Slug };

    internal static RateLimitPartition<string> CreatePartition(HttpContext httpContext, PolicySpec spec) =>
        BuildFixedWindow(PartitionKeyFor(httpContext, spec), spec.PermitLimit, spec.WindowMinutes);

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

    internal enum QuotaScope
    {
        Account,
        Address,
        Slug
    }

    internal readonly record struct PolicySpec(string Name, int PermitLimit, int WindowMinutes, QuotaScope Scope = QuotaScope.Account);

}

internal static class ClientIpPartitionKey
{
    private const int Ipv6NetworkPrefixBytes = 8;

    internal static string Get(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress;
        if (ip is null)
            return "unknown";
        if (ip.IsIPv4MappedToIPv6)
            return ip.MapToIPv4().ToString();
        return ip.AddressFamily == AddressFamily.InterNetworkV6 ? Ipv6NetworkOf(ip) : ip.ToString();
    }

    private static string Ipv6NetworkOf(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        Array.Clear(bytes, Ipv6NetworkPrefixBytes, bytes.Length - Ipv6NetworkPrefixBytes);
        return $"{new IPAddress(bytes)}/{Ipv6NetworkPrefixBytes * 8}";
    }
}

internal static class RouteSlugPartitionKey
{
    internal static string? Get(HttpContext httpContext)
    {
        var slug = httpContext.Request.RouteValues["slug"]?.ToString();
        return string.IsNullOrWhiteSpace(slug) ? null : $"slug:{slug}";
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
