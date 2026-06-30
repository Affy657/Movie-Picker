using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Moq;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class MoviePickerCookieAuthenticationConfigurerTests
{
    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static CookieAuthenticationOptions Configure(string environment)
    {
        var configurer = new MoviePickerCookieAuthenticationConfigurer(
            new Mock<ITicketStore>().Object,
            new FakeHostEnvironment { EnvironmentName = environment });
        var options = new CookieAuthenticationOptions();
        configurer.Configure(CookieAuthenticationDefaults.AuthenticationScheme, options);
        return options;
    }

    [Fact]
    public void Configure_SetsHardenedCookieDefaults()
    {
        var options = Configure(Environments.Production);

        Assert.Equal(AuthConstants.CookieName, options.Cookie.Name);
        Assert.True(options.Cookie.HttpOnly);
        Assert.Equal("/", options.Cookie.Path);
        Assert.Equal(TimeSpan.FromDays(14), options.ExpireTimeSpan);
        Assert.True(options.SlidingExpiration);
        Assert.NotNull(options.SessionStore);
    }

    [Fact]
    public void Configure_Development_UsesLaxSameAsRequestCookie()
    {
        var options = Configure(Environments.Development);

        Assert.Equal(CookieSecurePolicy.SameAsRequest, options.Cookie.SecurePolicy);
        Assert.Equal(SameSiteMode.Lax, options.Cookie.SameSite);
    }

    [Fact]
    public void Configure_Production_UsesAlwaysSecureNoneCookie()
    {
        var options = Configure(Environments.Production);

        Assert.Equal(CookieSecurePolicy.Always, options.Cookie.SecurePolicy);
        Assert.Equal(SameSiteMode.None, options.Cookie.SameSite);
    }

    [Fact]
    public void Configure_OtherScheme_IsIgnored()
    {
        var configurer = new MoviePickerCookieAuthenticationConfigurer(
            new Mock<ITicketStore>().Object,
            new FakeHostEnvironment());
        var options = new CookieAuthenticationOptions();

        configurer.Configure("Bearer", options);

        Assert.NotEqual(AuthConstants.CookieName, options.Cookie.Name);
        Assert.Null(options.SessionStore);
    }

    [Fact]
    public async Task OnRedirectToLogin_Returns401Json()
    {
        var options = Configure(Environments.Production);
        var (context, readBody) = CreateRedirectContext(options);

        await options.Events.OnRedirectToLogin(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);
        var body = readBody();
        Assert.Contains("\"code\":401", body);
        Assert.Contains("Authentification requise.", body);
    }

    [Fact]
    public async Task OnRedirectToAccessDenied_Returns403Json()
    {
        var options = Configure(Environments.Production);
        var (context, readBody) = CreateRedirectContext(options);

        await options.Events.OnRedirectToAccessDenied(context);

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);
        Assert.Contains("\"code\":403", readBody());
    }

    private static (RedirectContext<CookieAuthenticationOptions> Context, Func<string> ReadBody) CreateRedirectContext(
        CookieAuthenticationOptions options)
    {
        var http = new DefaultHttpContext();
        var body = new MemoryStream();
        http.Response.Body = body;
        var scheme = new AuthenticationScheme(
            CookieAuthenticationDefaults.AuthenticationScheme,
            displayName: null,
            handlerType: typeof(CookieAuthenticationHandler));
        var context = new RedirectContext<CookieAuthenticationOptions>(
            http, scheme, options, new AuthenticationProperties(), "/login");

        string ReadBody()
        {
            body.Seek(0, SeekOrigin.Begin);
            return new StreamReader(body).ReadToEnd();
        }

        return (context, ReadBody);
    }
}
