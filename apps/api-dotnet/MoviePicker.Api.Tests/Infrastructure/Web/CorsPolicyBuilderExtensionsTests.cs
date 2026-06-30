using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CorsPolicyBuilderExtensionsTests
{
    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static IConfiguration Config(string? allowedOrigins) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["ALLOWED_ORIGINS"] = allowedOrigins })
            .Build();

    private static CorsPolicy BuildPolicy(IConfiguration config, IHostEnvironment environment)
    {
        var builder = new CorsPolicyBuilder();
        builder.ConfigureMoviePickerCors(config, environment);
        return builder.Build();
    }

    [Fact]
    public void Configure_Always_AllowsCredentialsMethodsHeaders_AndExposesCorrelationHeader()
    {
        var policy = BuildPolicy(Config("https://app.example"), new FakeHostEnvironment());

        Assert.True(policy.SupportsCredentials);
        Assert.True(policy.AllowAnyMethod);
        Assert.True(policy.AllowAnyHeader);
        Assert.Contains(CorrelationIdConstants.ResponseHeaderName, policy.ExposedHeaders);
    }

    [Fact]
    public void Configure_Production_WithOrigins_RestrictsToConfiguredList()
    {
        var policy = BuildPolicy(
            Config("https://a.example, https://b.example"),
            new FakeHostEnvironment { EnvironmentName = Environments.Production });

        Assert.Contains("https://a.example", policy.Origins);
        Assert.Contains("https://b.example", policy.Origins);
    }

    [Fact]
    public void Configure_Production_WithoutOrigins_Throws()
    {
        Assert.Throws<InvalidOperationException>(() =>
            BuildPolicy(Config(""), new FakeHostEnvironment { EnvironmentName = Environments.Production }));
    }

    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("https://127.0.0.1:3000")]
    public void Configure_Development_AllowsLocalOrigins(string origin)
    {
        var policy = BuildPolicy(Config(null), new FakeHostEnvironment { EnvironmentName = Environments.Development });

        Assert.True(policy.IsOriginAllowed(origin));
    }

    [Fact]
    public void Configure_Development_AllowsConfiguredOrigin()
    {
        var policy = BuildPolicy(
            Config("https://staging.example"),
            new FakeHostEnvironment { EnvironmentName = Environments.Development });

        Assert.True(policy.IsOriginAllowed("https://staging.example"));
    }

    [Fact]
    public void Configure_Development_RejectsUnknownOrigin()
    {
        var policy = BuildPolicy(Config(null), new FakeHostEnvironment { EnvironmentName = Environments.Development });

        Assert.False(policy.IsOriginAllowed("https://evil.example"));
    }
}
