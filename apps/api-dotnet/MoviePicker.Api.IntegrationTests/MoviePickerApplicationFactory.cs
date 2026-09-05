using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.IntegrationTests.Helpers;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MoviePickerApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _mongoUri = IntegrationTestMongo.BuildIsolatedDatabaseUri();

    public FakeEmailSender FakeEmail { get; } = new();
    public FakeGitHubIssueClient FakeGitHubIssues { get; } = new();

    public bool RunsAgainstMongo => _mongoUri.Length > 0;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MONGODB_URI"] = _mongoUri,
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

    protected override void Dispose(bool disposing)
    {
        if (disposing && RunsAgainstMongo)
            IntegrationTestMongo.DropDatabase(_mongoUri);

        base.Dispose(disposing);
    }
}

public static class IntegrationTestMongo
{
    private const string DatabasePrefix = "moviepicker_it_";

    public static string BuildIsolatedDatabaseUri()
    {
        var configured = Environment.GetEnvironmentVariable("MONGODB_TEST_URI");
        if (string.IsNullOrWhiteSpace(configured))
            return string.Empty;

        var url = new MongoUrlBuilder(configured.Trim())
        {
            DatabaseName = DatabasePrefix + Guid.NewGuid().ToString("N")
        };
        return url.ToString();
    }

    public static void DropDatabase(string uri)
    {
        try
        {
            var url = new MongoUrl(uri);
            new MongoClient(url).DropDatabase(url.DatabaseName);
        }
        catch (MongoException)
        {
        }
    }
}
