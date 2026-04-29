using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Email;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Email;

public class EmailServiceCollectionExtensionsTests
{
    [Fact]
    public void AddEmailSender_NoConfig_RegistersLogEmailSender()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddOptions<MoviePickerOptions>();
        var cfg = new ConfigurationBuilder().Build();
        var env = new TestHostEnv { EnvironmentName = Environments.Development };
        services.AddEmailSender(cfg, env);

        var sender = services.BuildServiceProvider().GetRequiredService<IEmailSender>();

        Assert.IsType<LogEmailSender>(sender);
    }

    [Fact]
    public void AddEmailSender_EmailProviderResendWithApiKey_RegistersResendEmailSender()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddOptions<MoviePickerOptions>();
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["EMAIL_PROVIDER"] = "resend",
                ["RESEND_API_KEY"] = "re_test"
            }).Build();
        var env = new TestHostEnv { EnvironmentName = Environments.Development };
        services.AddEmailSender(cfg, env);

        var sender = services.BuildServiceProvider().GetRequiredService<IEmailSender>();

        Assert.IsType<ResendEmailSender>(sender);
    }

    [Fact]
    public void AddEmailSender_EmailProviderResendWithoutApiKey_FallsBackToLogEmailSender()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddOptions<MoviePickerOptions>();
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["EMAIL_PROVIDER"] = "resend"
                // RESEND_API_KEY absente
            }).Build();
        var env = new TestHostEnv { EnvironmentName = Environments.Development };
        services.AddEmailSender(cfg, env);

        var sender = services.BuildServiceProvider().GetRequiredService<IEmailSender>();

        Assert.IsType<LogEmailSender>(sender);
    }

    private sealed class TestHostEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
