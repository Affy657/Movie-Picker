using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Email;

/// <summary>Sélection du provider email selon <c>EMAIL_PROVIDER</c> et <c>RESEND_API_KEY</c>.</summary>
public static class EmailServiceCollectionExtensions
{
    public static IServiceCollection AddEmailSender(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var provider = (configuration["EMAIL_PROVIDER"] ?? "log").Trim().ToLowerInvariant();
        var apiKey = configuration["RESEND_API_KEY"];
        var apiBase = (configuration["RESEND_API_BASE_URL"] ?? "https://api.resend.com").TrimEnd('/');

        if (provider == "resend" && !string.IsNullOrWhiteSpace(apiKey))
        {
            services.AddHttpClient<IEmailSender, ResendEmailSender>(c =>
            {
                c.BaseAddress = new Uri(apiBase + "/");
                c.Timeout = TimeSpan.FromSeconds(15);
                c.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
            });
            return services;
        }

        services.AddSingleton<IEmailSender, LogEmailSender>();

        if (!environment.IsDevelopment() && provider == "resend")
        {
            // EMAIL_PROVIDER=resend voulu mais RESEND_API_KEY absente : fallback silencieux + warning au démarrage.
            // Le logger n'est pas encore disponible ici, donc on écrit sur stderr (visible dans Cloud Run logs).
            Console.Error.WriteLine(
                "[WARN] EMAIL_PROVIDER=resend mais RESEND_API_KEY absente → fallback LogEmailSender. " +
                "Les emails (mot de passe oublié) ne seront PAS envoyés.");
        }

        return services;
    }
}
