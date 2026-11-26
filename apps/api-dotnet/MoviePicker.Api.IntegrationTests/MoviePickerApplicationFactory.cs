using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Migrations;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.IntegrationTests.Helpers;

namespace MoviePicker.Api.IntegrationTests;

internal static class IntegrationTestContext
{
    [ModuleInitializer]
    internal static void DeclareTestContext() =>
        Environment.SetEnvironmentVariable(EnvLoader.TestContextVariable, "1");
}

public sealed class MoviePickerApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _mongoUri = IntegrationTestMongo.BuildIsolatedDatabaseUri();

    public MoviePickerApplicationFactory()
    {
        Environment.SetEnvironmentVariable("MONGODB_URI", _mongoUri);
    }

    public FakeEmailSender FakeEmail { get; } = new();
    public FakeGitHubIssueClient FakeGitHubIssues { get; } = new();
    public FakeWebShellSource FakeWebShell { get; } = new();

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
                ["PUBLIC_API_BASE_URL"] = "https://api.integration.test",
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

            services.RemoveAll<IWebShellSource>();
            services.AddSingleton<IWebShellSource>(FakeWebShell);

            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch, StubTmdbMovieSearch>();

            RunDataMigrationsBeforeTheTests(services);
        });
    }

    private static void RunDataMigrationsBeforeTheTests(IServiceCollection services)
    {
        var delayedRunner = services.SingleOrDefault(descriptor =>
            descriptor.ServiceType == typeof(IHostedService) && descriptor.ImplementationType == typeof(DataMigrationRunner));
        if (delayedRunner is null)
            return;

        services.Remove(delayedRunner);
        services.AddSingleton(provider => new DataMigrationRunner(
            provider.GetRequiredService<IServiceScopeFactory>(),
            provider.GetRequiredService<TimeProvider>(),
            provider.GetRequiredService<ILogger<DataMigrationRunner>>(),
            startupDelay: TimeSpan.Zero));
        services.AddHostedService(provider => provider.GetRequiredService<DataMigrationRunner>());
        services.AddHostedService(provider => new DataMigrationsCompleted(provider.GetRequiredService<DataMigrationRunner>()));
    }

    private sealed class DataMigrationsCompleted(DataMigrationRunner runner) : IHostedService
    {
        public Task StartAsync(CancellationToken cancellationToken) =>
            (runner.ExecuteTask ?? Task.CompletedTask).WaitAsync(cancellationToken);

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            IntegrationTestMongo.DropDatabase(_mongoUri);
            Environment.SetEnvironmentVariable("MONGODB_URI", null);
        }

        base.Dispose(disposing);
    }
}

public static class IntegrationTestMongo
{
    private const string DatabasePrefix = "moviepicker_it_";

    internal const string MissingTestUriMessage =
        "MONGODB_TEST_URI is not set: the integration suite only runs on a MongoDB replica set. "
        + "Run it with `pnpm run test:api:mongo`, which starts the movie-picker-mongo-test container on 27018 "
        + "and sets the variable, or start that container with "
        + "`node scripts/mongo-replica-set.mjs --container movie-picker-mongo-test --port 27018` "
        + "and set MONGODB_TEST_URI=mongodb://127.0.0.1:27018/?directConnection=true.";

    public static string BuildIsolatedDatabaseUri()
    {
        var configured = Environment.GetEnvironmentVariable("MONGODB_TEST_URI");
        if (string.IsNullOrWhiteSpace(configured))
            throw new InvalidOperationException(MissingTestUriMessage);

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
