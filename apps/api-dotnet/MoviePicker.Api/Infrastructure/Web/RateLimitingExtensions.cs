using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>
/// Limites par IP (clé = partition) sur création d'event, join, recherche TMDB et détails film.
///
/// <para>
/// <strong>Dev / CI</strong> : toutes les policies sont enregistrées en
/// <c>NoLimiter</c> pour ne pas freiner le développement local et les tests
/// d'intégration (qui peuvent enchaîner 100+ requêtes par fixture). C'est un
/// choix intentionnel et homogène — y compris pour les actions sensibles
/// comme <c>DeleteEventPolicy</c>. La limite « réelle » (10/min) ne s'active
/// qu'en environnement non-Development. Si on souhaitait un jour valider la
/// limite côté CI, il faudrait basculer un environnement dédié (ex.
/// <c>ASPNETCORE_ENVIRONMENT=Test</c>) et adapter la branche ci-dessous.
/// </para>
/// </summary>
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
    public const string PatchEventConfigPolicy = "patch-event-config";
    public const string VoteMutationPolicy = "vote-mutation";
    public const string SeenMarksMutationPolicy = "seen-marks-mutation";
    public const string RemoveParticipantPolicy = "remove-participant";
    public const string DeleteEventPolicy = "delete-event";
    public const string PostersPolicy = "posters-get";

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
                options.AddPolicy(PatchEventConfigPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(VoteMutationPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(SeenMarksMutationPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(RemoveParticipantPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(DeleteEventPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                options.AddPolicy(PostersPolicy, _ => RateLimitPartition.GetNoLimiter("dev"));
                return;
            }

            options.AddPolicy(CreateEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 20, windowMinutes: 1));
            options.AddPolicy(JoinEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 60, windowMinutes: 1));
            options.AddPolicy(SearchMoviesPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
            // Details : endpoint consultatif (ouverture panneau « plus d'infos »), budget plus large car cache TMDB absorbe la charge.
            options.AddPolicy(MovieDetailsPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            options.AddPolicy(AuthRegisterPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 10, windowMinutes: 1));
            options.AddPolicy(AuthLoginPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 30, windowMinutes: 1));
            // Reset password : budget volontairement bas côté request (anti-spam) et plus large côté confirm
            // (l'utilisateur peut se tromper en saisissant le nouveau mot de passe ou retenter sur le lien).
            options.AddPolicy(AuthPasswordResetRequestPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 5, windowMinutes: 1));
            options.AddPolicy(AuthPasswordResetConfirmPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 30, windowMinutes: 1));
            // Change password : sensible (vérifie le mot de passe actuel) → anti-brute-force serré.
            options.AddPolicy(AuthChangePasswordPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 10, windowMinutes: 1));
            options.AddPolicy(PatchEventConfigPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
            // Votes et marqueurs « déjà vu » : mêmes ordres de grandeur (toggle par film et par participant).
            options.AddPolicy(VoteMutationPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            options.AddPolicy(SeenMarksMutationPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 120, windowMinutes: 1));
            // Retrait participant : mutation rare (cascade lourde), budget aligné sur PatchEventConfig.
            options.AddPolicy(RemoveParticipantPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 40, windowMinutes: 1));
            // Suppression d'une soirée : action irréversible, budget volontairement faible
            // (10/min) pour limiter l'impact d'un script malveillant sur un compte compromis.
            options.AddPolicy(DeleteEventPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 10, windowMinutes: 1));
            options.AddPolicy(PostersPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 300, windowMinutes: 1));
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
