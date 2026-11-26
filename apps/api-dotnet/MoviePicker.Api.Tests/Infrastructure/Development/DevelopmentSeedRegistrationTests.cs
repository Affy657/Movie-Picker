using System.Diagnostics;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Development;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Development;

public sealed class DevelopmentSeedRegistrationTests
{
    private sealed class FakeEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static readonly Assembly ApiAssembly = typeof(MoviePicker.Api.Infrastructure.ServiceCollectionExtensions).Assembly;

    private static IConfiguration Configuration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    private static ServiceCollection Wire(string environment)
    {
        var services = new ServiceCollection();
        services.AddMoviePicker(
            Configuration(new Dictionary<string, string?> { ["MONGODB_URI"] = "mongodb://localhost:27017/moviepicker_unit" }),
            new FakeEnv { EnvironmentName = environment });
        return services;
    }

    private static int SeedRegistrations(IServiceCollection services) =>
        services.Count(d => d.ServiceType == typeof(IHostedService) && d.ImplementationType == typeof(DevelopmentDataSeedHostedService));

    private static bool IsDebugBuild(Assembly assembly) =>
        assembly.GetCustomAttribute<DebuggableAttribute>()?.IsJITOptimizerDisabled == true;

    [Fact]
    public void TheApiAssemblyCarriesTheSeedOnlyInADebugBuild()
    {
        var seedTypeInApi = ApiAssembly.GetType(typeof(DevelopmentDataSeedHostedService).FullName!);

        Assert.Equal(IsDebugBuild(ApiAssembly), seedTypeInApi is not null);
    }

    [Fact]
    public void Development_SeedsDemoDataExactlyWhenTheSeedIsCompiledIntoTheApi()
    {
        var seedCompiledIntoTheApi = typeof(DevelopmentDataSeedHostedService).Assembly == ApiAssembly;

        Assert.Equal(seedCompiledIntoTheApi ? 1 : 0, SeedRegistrations(Wire(Environments.Development)));
    }

    [Fact]
    public void Production_NeverSeedsDemoData()
    {
        Assert.Equal(0, SeedRegistrations(Wire(Environments.Production)));
    }

    [Fact]
    public void AddDevelopmentSeed_RegistersTheSeedOnceAndBindsItsSection()
    {
        var services = new ServiceCollection();
        var configuration = Configuration(new Dictionary<string, string?>
        {
            ["DevelopmentSeed:Enabled"] = "true",
            ["DevelopmentSeed:Email"] = "dev@test.local",
            ["DevelopmentSeed:ExtraUsers:0:Email"] = "alice@test.local"
        });

        services.AddDevelopmentSeed(configuration);
        services.AddDevelopmentSeed(configuration);

        Assert.Equal(1, SeedRegistrations(services));
        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<DevelopmentSeedOptions>>().Value;
        Assert.True(options.Enabled);
        Assert.Equal("dev@test.local", options.Email);
        Assert.Equal("alice@test.local", Assert.Single(options.ExtraUsers).Email);
    }
}
