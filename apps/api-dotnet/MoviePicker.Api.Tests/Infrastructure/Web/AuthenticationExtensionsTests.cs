using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class AuthenticationExtensionsTests
{
    private static ServiceProvider BuildProvider(IConfiguration configuration)
    {
        var services = new ServiceCollection();
        services.AddSingleton(configuration);
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());
        services.AddLogging();
        services.AddDataProtection();
        services.AddHttpClient();
        services.AddMoviePickerAuthentication(configuration);
        return services.BuildServiceProvider();
    }

    private static CookieAuthenticationOptions ResolveCookieOptions()
    {
        var configuration = new ConfigurationBuilder().Build();
        using var provider = BuildProvider(configuration);
        return provider
            .GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(CookieAuthenticationDefaults.AuthenticationScheme);
    }

    [Fact]
    public void AddMoviePickerAuthentication_AppliesConfigurerToCookieOptions()
    {
        var options = ResolveCookieOptions();

        Assert.Equal(AuthConstants.CookieName, options.Cookie.Name);
        Assert.NotNull(options.SessionStore);
        Assert.Equal(AuthConstants.SessionLifetime, options.ExpireTimeSpan);
    }

    [Fact]
    public async Task AddMoviePickerAuthentication_NoOAuthConfig_RegistersOnlyCookieSchemes()
    {
        var configuration = new ConfigurationBuilder().Build();
        using var provider = BuildProvider(configuration);
        var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();

        var schemes = (await schemeProvider.GetAllSchemesAsync()).Select(s => s.Name).ToList();

        Assert.Contains(CookieAuthenticationDefaults.AuthenticationScheme, schemes);
        Assert.Contains(AuthConstants.ExternalCookieScheme, schemes);
        Assert.DoesNotContain(OAuthProviders.Google, schemes);
        Assert.DoesNotContain(OAuthProviders.GitHub, schemes);
    }

    [Fact]
    public async Task AddMoviePickerAuthentication_WithOAuthConfig_RegistersGoogleAndGitHubSchemes()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OAUTH_GOOGLE_CLIENT_ID"] = "google-id",
                ["OAUTH_GOOGLE_CLIENT_SECRET"] = "google-secret",
                ["OAUTH_GITHUB_CLIENT_ID"] = "github-id",
                ["OAUTH_GITHUB_CLIENT_SECRET"] = "github-secret"
            })
            .Build();
        using var provider = BuildProvider(configuration);
        var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();

        var schemes = (await schemeProvider.GetAllSchemesAsync()).Select(s => s.Name).ToList();

        Assert.Contains(OAuthProviders.Google, schemes);
        Assert.Contains(OAuthProviders.GitHub, schemes);

        var catalog = provider.GetRequiredService<OAuthProviderCatalog>();
        Assert.True(catalog.IsEnabled(OAuthProviders.Google));
        Assert.True(catalog.IsEnabled(OAuthProviders.GitHub));
    }
}
