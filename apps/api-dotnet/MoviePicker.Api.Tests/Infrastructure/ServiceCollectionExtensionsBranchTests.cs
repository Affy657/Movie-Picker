using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.BackgroundServices;
using MoviePicker.Api.Infrastructure.Development;
using MoviePicker.Api.Infrastructure.Letterboxd;
using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class ServiceCollectionExtensionsBranchTests
{
    private sealed class FakeEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private const string DevMongoUri = "mongodb://localhost:27017/moviepicker_dev";

    private static IServiceCollection Wire(
        Dictionary<string, string?> config,
        string? environmentName = null)
    {
        var environment = environmentName ?? Environments.Development;
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(config).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddMoviePicker(configuration, new FakeEnv { EnvironmentName = environment });
        return services;
    }

    private static MoviePickerOptions OptionsFrom(Dictionary<string, string?> config)
    {
        using var provider = Wire(config).BuildServiceProvider();
        return provider.GetRequiredService<IOptions<MoviePickerOptions>>().Value;
    }

    private static bool HasHostedService<THostedService>(IServiceCollection services) =>
        services.Any(d =>
            d.ServiceType == typeof(IHostedService)
            && d.ImplementationType == typeof(THostedService));

    private static Type? ImplOf<TService>(IServiceCollection services) =>
        services.LastOrDefault(d => d.ServiceType == typeof(TService))?.ImplementationType;

    [Fact]
    public void Development_RunsTheReminderPassInProcess()
    {
        Assert.True(HasHostedService<EventReminderService>(Wire([], Environments.Development)));
    }

    [Fact]
    public void Production_WithoutTheFlag_LeavesRemindersToTheScheduler()
    {
        Assert.False(HasHostedService<EventReminderService>(Wire([], Environments.Production)));
    }

    [Theory]
    [InlineData("1", true)]
    [InlineData("true", true)]
    [InlineData("TRUE", true)]
    [InlineData("0", false)]
    [InlineData("false", false)]
    [InlineData("", false)]
    [InlineData("   ", false)]
    [InlineData("oui", false)]
    public void Production_HonoursTheInProcessRemindersFlag(string flag, bool expected)
    {
        var services = Wire(
            new Dictionary<string, string?> { ["IN_PROCESS_REMINDERS_ENABLED"] = flag },
            Environments.Production);

        Assert.Equal(expected, HasHostedService<EventReminderService>(services));
        Assert.Equal(
            expected,
            OptionsFrom(new Dictionary<string, string?> { ["IN_PROCESS_REMINDERS_ENABLED"] = flag })
                .InProcessRemindersEnabled);
    }

    [Fact]
    public void Development_SeedsDemoData()
    {
        Assert.True(HasHostedService<DevelopmentDataSeedHostedService>(Wire([], Environments.Development)));
    }

    [Fact]
    public void Production_NeverSeedsDemoData()
    {
        Assert.False(HasHostedService<DevelopmentDataSeedHostedService>(Wire([], Environments.Production)));
    }

    [Fact]
    public void LetterboxdStubFlag_ReplacesTheRealClient()
    {
        var services = Wire(new Dictionary<string, string?> { ["E2E_STUB_LETTERBOXD"] = "1" });

        Assert.Equal(typeof(StubLetterboxdWatchlistClient), ImplOf<ILetterboxdWatchlistClient>(services));
    }

    [Fact]
    public void WithoutTheLetterboxdStubFlag_TheRealClientIsWiredOnHttp()
    {
        var services = Wire([]);

        Assert.Null(ImplOf<ILetterboxdWatchlistClient>(services));
        Assert.Contains(services, d => d.ServiceType == typeof(ILetterboxdWatchlistClient));
    }

    [Fact]
    public void PosterCacheEnabledWithMongo_StoresPostersInMongo()
    {
        var services = Wire(new Dictionary<string, string?> { ["MONGODB_URI"] = DevMongoUri });

        Assert.Equal(typeof(MongoPosterImageStore), ImplOf<IPosterImageStore>(services));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("false")]
    [InlineData("FALSE")]
    public void PosterCacheDisabled_BeatsTheMongoBranch(string flag)
    {
        var services = Wire(new Dictionary<string, string?>
        {
            ["MONGODB_URI"] = DevMongoUri,
            ["POSTER_CACHE_ENABLED"] = flag
        });

        Assert.Equal(typeof(DisabledPosterImageStore), ImplOf<IPosterImageStore>(services));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("1")]
    [InlineData("true")]
    public void PosterCacheFlagAbsentOrTruthy_KeepsTheCacheOn(string? flag)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["POSTER_CACHE_ENABLED"] = flag });

        Assert.True(options.PosterCacheEnabled);
    }

    [Fact]
    public void TmdbRegion_FallsBackToFranceAndIsTrimmed()
    {
        Assert.Equal("FR", OptionsFrom([]).TmdbWatchProvidersRegion);
        Assert.Equal(
            "FR",
            OptionsFrom(new Dictionary<string, string?> { ["TMDB_WATCH_REGION"] = "  " })
                .TmdbWatchProvidersRegion);
        Assert.Equal(
            "BE",
            OptionsFrom(new Dictionary<string, string?> { ["TMDB_WATCH_REGION"] = " BE " })
                .TmdbWatchProvidersRegion);
    }

    [Fact]
    public void BlankTmdbApiKey_ReadsAsAbsent()
    {
        Assert.Null(OptionsFrom(new Dictionary<string, string?> { ["TMDB_API_KEY"] = "   " }).TmdbApiKey);
        Assert.Equal(
            "abc",
            OptionsFrom(new Dictionary<string, string?> { ["TMDB_API_KEY"] = "abc" }).TmdbApiKey);
    }

    [Theory]
    [InlineData("48", 48)]
    [InlineData("0", 24)]
    [InlineData("-3", 24)]
    [InlineData("pas-un-nombre", 24)]
    [InlineData(null, 24)]
    public void TmdbEnrichmentCacheHours_KeepsItsDefaultOnAnyInvalidValue(string? raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["TMDB_ENRICHMENT_CACHE_HOURS"] = raw });

        Assert.Equal(expected, options.TmdbEnrichmentCacheHours);
    }

    [Theory]
    [InlineData("0", 0)]
    [InlineData("25", 25)]
    [InlineData("-1", 10)]
    [InlineData("bruit", 10)]
    public void TmdbSearchMaxProviderLookups_AcceptsZeroButNotNegatives(string raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["TMDB_SEARCH_MAX_PROVIDER_LOOKUPS"] = raw });

        Assert.Equal(expected, options.TmdbSearchMaxWatchProviderLookups);
    }

    [Theory]
    [InlineData("8", 8)]
    [InlineData("64", 16)]
    [InlineData("0", 4)]
    public void TmdbListEnrichmentParallelism_IsCappedAtSixteen(string raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["TMDB_LIST_ENRICHMENT_MAX_PARALLEL"] = raw });

        Assert.Equal(expected, options.TmdbListEnrichmentMaxParallelism);
    }

    [Theory]
    [InlineData("12", 12)]
    [InlineData("0", 3)]
    public void TmdbHttpTimeout_KeepsItsDefaultOnAnInvalidValue(string raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["TMDB_HTTP_TIMEOUT_SECONDS"] = raw });

        Assert.Equal(expected, options.TmdbHttpTimeoutSeconds);
    }

    [Theory]
    [InlineData("30", 30)]
    [InlineData("0", 5)]
    public void TmdbFailureCacheMinutes_KeepsItsDefaultOnAnInvalidValue(string raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["TMDB_FAILURE_CACHE_MINUTES"] = raw });

        Assert.Equal(expected, options.TmdbFailureCacheMinutes);
    }

    [Theory]
    [InlineData("7", 7)]
    [InlineData("0", 30)]
    public void PosterCacheTtl_KeepsItsDefaultOnAnInvalidValue(string raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["POSTER_CACHE_TTL_DAYS"] = raw });

        Assert.Equal(expected, options.PosterCacheTtlDays);
    }

    [Theory]
    [InlineData("4096", 4096)]
    [InlineData("4095", 524_288)]
    public void PosterCacheMaxBytes_RefusesAnythingUnderFourKilobytes(string raw, int expected)
    {
        var options = OptionsFrom(new Dictionary<string, string?> { ["POSTER_CACHE_MAX_BYTES"] = raw });

        Assert.Equal(expected, options.PosterCacheMaxBytes);
    }

    [Fact]
    public void PublicWebBaseUrl_IsTrimmedOfItsTrailingSlash()
    {
        var options = OptionsFrom(new Dictionary<string, string?>
        {
            ["PUBLIC_WEB_BASE_URL"] = "  https://www.movie-picker.fr/  "
        });

        Assert.Equal("https://www.movie-picker.fr", options.PublicWebBaseUrl);
    }

    [Fact]
    public void PublicWebBaseUrl_BlankKeepsTheDefault()
    {
        Assert.Equal("https://web.movie-picker.fr", OptionsFrom([]).PublicWebBaseUrl);
        Assert.Equal(
            "https://web.movie-picker.fr",
            OptionsFrom(new Dictionary<string, string?> { ["PUBLIC_WEB_BASE_URL"] = "  " }).PublicWebBaseUrl);
    }

    [Fact]
    public void SchedulerToken_BlankReadsAsAbsentAndIsOtherwiseTrimmed()
    {
        Assert.Null(OptionsFrom([]).SchedulerToken);
        Assert.Null(OptionsFrom(new Dictionary<string, string?> { ["SCHEDULER_TOKEN"] = "  " }).SchedulerToken);
        Assert.Equal(
            "secret",
            OptionsFrom(new Dictionary<string, string?> { ["SCHEDULER_TOKEN"] = " secret " }).SchedulerToken);
    }

    [Fact]
    public void KofiWebhookToken_BlankKeepsItAbsentAndIsOtherwiseTrimmed()
    {
        Assert.Null(OptionsFrom(new Dictionary<string, string?> { ["KOFI_WEBHOOK_TOKEN"] = "  " }).KofiWebhookToken);
        Assert.Equal(
            "jeton",
            OptionsFrom(new Dictionary<string, string?> { ["KOFI_WEBHOOK_TOKEN"] = " jeton " }).KofiWebhookToken);
    }

    [Fact]
    public void VapidKeys_AreStrippedOfTheNewlinesSecretManagerAdds()
    {
        var options = OptionsFrom(new Dictionary<string, string?>
        {
            ["VAPID_PUBLIC_KEY"] = "BPubliqueAbc-_123\n",
            ["VAPID_PRIVATE_KEY"] = "\r\nPriveeXyz-_456 ",
            ["VAPID_SUBJECT"] = "  mailto:contact@movie-picker.fr  "
        });

        Assert.Equal("BPubliqueAbc-_123", options.VapidPublicKey);
        Assert.Equal("PriveeXyz-_456", options.VapidPrivateKey);
        Assert.Equal("mailto:contact@movie-picker.fr", options.VapidSubject);
    }

    [Fact]
    public void VapidKeys_AbsentKeepTheirDefaults()
    {
        var options = OptionsFrom([]);

        Assert.Null(options.VapidPublicKey);
        Assert.Null(options.VapidPrivateKey);
        Assert.Equal("mailto:noreply@movie-picker.fr", options.VapidSubject);
    }

    [Fact]
    public void EmailOptions_AreNormalisedAndBlankValuesKeepTheDefaults()
    {
        var configured = OptionsFrom(new Dictionary<string, string?>
        {
            ["EMAIL_PROVIDER"] = "  RESEND  ",
            ["EMAIL_FROM_ADDRESS"] = "  bonjour@movie-picker.fr ",
            ["EMAIL_FROM_NAME"] = " Movie Picker Bot ",
            ["RESEND_API_KEY"] = "re_123",
            ["RESEND_API_BASE_URL"] = " https://api.resend.com/ "
        });

        Assert.Equal("resend", configured.EmailProvider);
        Assert.Equal("bonjour@movie-picker.fr", configured.EmailFromAddress);
        Assert.Equal("Movie Picker Bot", configured.EmailFromName);
        Assert.Equal("re_123", configured.ResendApiKey);
        Assert.Equal("https://api.resend.com", configured.ResendApiBaseUrl);

        var blank = OptionsFrom(new Dictionary<string, string?>
        {
            ["EMAIL_PROVIDER"] = "  ",
            ["EMAIL_FROM_ADDRESS"] = "  ",
            ["RESEND_API_KEY"] = "   "
        });

        Assert.Equal("log", blank.EmailProvider);
        Assert.Equal("noreply@movie-picker.fr", blank.EmailFromAddress);
        Assert.Null(blank.ResendApiKey);
    }

    [Fact]
    public void GitHubOptions_BlankValuesKeepTheDefaults()
    {
        var options = OptionsFrom(new Dictionary<string, string?>
        {
            ["GITHUB_TOKEN"] = "   ",
            ["GITHUB_REPO_OWNER"] = "  ",
            ["GITHUB_REPO_NAME"] = "  "
        });

        Assert.Null(options.GitHubToken);
        Assert.Equal("Affy657", options.GitHubRepoOwner);
        Assert.Equal("Movie-Picker", options.GitHubRepoName);
    }

    [Fact]
    public void MongoUri_IsCarriedIntoTheOptions()
    {
        Assert.Equal(string.Empty, OptionsFrom([]).MongoDbUri);
        Assert.Equal(
            DevMongoUri,
            OptionsFrom(new Dictionary<string, string?> { ["MONGODB_URI"] = DevMongoUri }).MongoDbUri);
    }

    [Fact]
    public void EveryRegistrationResolvesWithoutMongo()
    {
        using var provider = Wire([]).BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateOnBuild = false,
            ValidateScopes = true
        });
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetRequiredService<IEventRepository>());
        Assert.NotNull(scope.ServiceProvider.GetRequiredService<IUnitOfWork>());
        Assert.NotNull(scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
        Assert.NotNull(scope.ServiceProvider.GetRequiredService<ISchedulerTokenValidator>());
        Assert.NotNull(scope.ServiceProvider.GetRequiredService<IPushNotificationSender>());
        Assert.NotNull(scope.ServiceProvider.GetRequiredService<IPosterImageStore>());
    }
}
