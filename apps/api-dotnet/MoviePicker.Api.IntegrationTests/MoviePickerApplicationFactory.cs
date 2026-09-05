using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.IntegrationTests.Helpers;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MoviePickerApplicationFactory : WebApplicationFactory<Program>
{
    public FakeEmailSender FakeEmail { get; } = new();
    public FakeGitHubIssueClient FakeGitHubIssues { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MONGODB_URI"] = "",
                ["TMDB_API_KEY"] = "test-key",
                ["PUBLIC_WEB_BASE_URL"] = "https://web.integration.test",
                ["DevelopmentSeed:Enabled"] = "false",
                ["DevelopmentSeed:SeedSampleEvents"] = "false",
                ["DevelopmentSeed:SeedScenarioDemos"] = "false"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(FakeEmail);

            services.RemoveAll<IGitHubIssueClient>();
            services.AddSingleton<IGitHubIssueClient>(FakeGitHubIssues);

            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch, StubTmdbMovieSearch>();
        });
    }
}
