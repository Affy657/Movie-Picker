using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Infrastructure.Posters;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class ServiceCollectionExtensionsTests
{
    private sealed class FakeEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static ServiceCollection Wire(Dictionary<string, string?> config, string environment)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(config).Build();
        var services = new ServiceCollection();
        services.AddMoviePicker(configuration, new FakeEnv { EnvironmentName = environment });
        return services;
    }

    private static Type? ImplOf<TService>(IServiceCollection services) =>
        services.LastOrDefault(d => d.ServiceType == typeof(TService))?.ImplementationType;

    [Fact]
    public void AddMoviePicker_NoMongoUri_RegistersInMemoryRepositories()
    {
        var services = Wire(new Dictionary<string, string?>(), Environments.Development);

        Assert.Equal(typeof(InMemoryEventRepository), ImplOf<IEventRepository>(services));
        Assert.Equal(typeof(InMemoryUserRepository), ImplOf<IUserRepository>(services));
        Assert.Equal(typeof(InMemoryParticipantRepository), ImplOf<IParticipantRepository>(services));
        Assert.Equal(typeof(InMemoryFollowRepository), ImplOf<IFollowRepository>(services));
        Assert.Equal(typeof(InMemoryUserNotificationRepository), ImplOf<IUserNotificationRepository>(services));
    }

    [Fact]
    public void AddMoviePicker_NoMongoUri_RegistersMemoryPosterStore()
    {
        var services = Wire(new Dictionary<string, string?>(), Environments.Development);

        Assert.Equal(typeof(MemoryPosterImageStore), ImplOf<IPosterImageStore>(services));
    }

    [Fact]
    public void AddMoviePicker_PosterCacheDisabled_RegistersDisabledPosterStore()
    {
        var services = Wire(
            new Dictionary<string, string?> { ["POSTER_CACHE_ENABLED"] = "false" },
            Environments.Development);

        Assert.Equal(typeof(DisabledPosterImageStore), ImplOf<IPosterImageStore>(services));
    }

    [Fact]
    public void AddMoviePicker_E2eStubFlag_RegistersStubTmdbSearch()
    {
        var services = Wire(
            new Dictionary<string, string?> { ["E2E_STUB_TMDB"] = "1" },
            Environments.Development);

        Assert.Equal(typeof(StubTmdbMovieSearch), ImplOf<ITmdbMovieSearch>(services));
    }

    [Fact]
    public void AddMoviePicker_DevelopmentTargetingProdDatabase_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => Wire(
            new Dictionary<string, string?> { ["MONGODB_URI"] = "mongodb://localhost:27017/moviepicker" },
            Environments.Development));

        Assert.Contains("moviepicker", ex.Message);
    }

    [Fact]
    public void AddMoviePicker_ProductionWithProdDatabase_RegistersMongoRepositories()
    {
        var services = Wire(
            new Dictionary<string, string?> { ["MONGODB_URI"] = "mongodb://localhost:27017/moviepicker" },
            Environments.Production);

        Assert.Equal(typeof(MongoEventRepository), ImplOf<IEventRepository>(services));
        Assert.Equal(typeof(MongoUserRepository), ImplOf<IUserRepository>(services));
    }

    [Fact]
    public void AddMoviePicker_DevelopmentWithDedicatedDatabase_RegistersMongoRepositories()
    {
        var services = Wire(
            new Dictionary<string, string?> { ["MONGODB_URI"] = "mongodb://localhost:27017/moviepicker_dev" },
            Environments.Development);

        Assert.Equal(typeof(MongoEventRepository), ImplOf<IEventRepository>(services));
    }
}
