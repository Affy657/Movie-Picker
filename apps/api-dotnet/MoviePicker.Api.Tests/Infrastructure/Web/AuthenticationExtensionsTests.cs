using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class AuthenticationExtensionsTests
{
    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static CookieAuthenticationOptions ResolveCookieOptions()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());
        services.AddLogging();
        services.AddDataProtection();
        services.AddMoviePickerAuthentication();

        using var provider = services.BuildServiceProvider();
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
}
