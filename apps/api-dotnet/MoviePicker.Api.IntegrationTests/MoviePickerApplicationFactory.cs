using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.IntegrationTests.Helpers;

namespace MoviePicker.Api.IntegrationTests;

/// <summary>
/// Factory pour les tests d'intégration. Utilise le mode in-memory (pas de MongoDB) en laissant MONGODB_URI vide.
/// </summary>
public sealed class MoviePickerApplicationFactory : WebApplicationFactory<Program>
{
    public FakeEmailSender FakeEmail { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MONGODB_URI"] = "", // force in-memory repositories
                ["TMDB_API_KEY"] = "test-key", // évite ServiceUnavailable sur la recherche
                ["PUBLIC_WEB_BASE_URL"] = "https://web.integration.test",
                // Seed léger : pas de soirées / scénarios démo (évite pollution des tests)
                ["DevelopmentSeed__SeedSampleEvents"] = "false",
                ["DevelopmentSeed__SeedScenarioDemos"] = "false"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(FakeEmail);
        });
    }
}
