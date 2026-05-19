using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace MoviePicker.Api.Infrastructure.Web;

internal static class CorsPolicyBuilderExtensions
{
    internal static void ConfigureMoviePickerCors(
        this CorsPolicyBuilder policy,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        policy
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders(CorrelationIdConstants.ResponseHeaderName);

        if (environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin => IsDevelopmentAllowedOrigin(origin, configuration));
            return;
        }

        var origins = ParseAllowedOrigins(configuration["ALLOWED_ORIGINS"]);
        if (origins.Count == 0)
        {
            throw new InvalidOperationException(
                "ALLOWED_ORIGINS est obligatoire en production (liste d'URLs séparées par des virgules, ex. https://d123.cloudfront.net).");
        }

        policy.WithOrigins(origins.ToArray());
    }

    private static bool IsDevelopmentAllowedOrigin(string? origin, IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(origin))
            return false;

        var configured = ParseAllowedOrigins(configuration["ALLOWED_ORIGINS"]);
        if (configured.Contains(origin, StringComparer.Ordinal))
            return true;

        return CorsOriginRules.IsLocalDevelopmentOrigin(origin);
    }

    private static HashSet<string> ParseAllowedOrigins(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return new HashSet<string>(StringComparer.Ordinal);

        return new HashSet<string>(
            raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            StringComparer.Ordinal);
    }
}
