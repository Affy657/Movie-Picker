using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.BackgroundServices;
using MoviePicker.Api.Infrastructure.Development;
using MoviePicker.Api.Infrastructure.Email;
using MoviePicker.Api.Infrastructure.GitHub;
using MoviePicker.Api.Infrastructure.Letterboxd;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Infrastructure.Posters;
using MoviePicker.Api.Infrastructure.Push;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Infrastructure;

public static class ServiceCollectionExtensions
{
    internal const string CorsPolicyFront = "Front";

    public static IServiceCollection AddMoviePicker(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services
            .AddOptions<MoviePickerOptions>()
            .Configure<IConfiguration>(ConfigureMoviePickerOptions);

        services.AddMemoryCache();

        services.AddCors(o =>
            o.AddPolicy(
                CorsPolicyFront,
                p => p.ConfigureMoviePickerCors(configuration, environment)));

        var mongoUri = configuration["MONGODB_URI"] ?? string.Empty;
        RegisterRepositories(services, mongoUri, environment);
        RegisterTmdbSearch(services, configuration);

        services.AddHttpClient(
                PosterFetchHttp.ClientName,
                client =>
                {
                    client.Timeout = TimeSpan.FromSeconds(20);
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
                })
            .ConfigurePrimaryHttpMessageHandler(
                static () => new SocketsHttpHandler { AllowAutoRedirect = false });

        RegisterPosterStore(services, configuration, mongoUri);

        services.AddHttpContextAccessor();
        services.AddScoped<IHostTokenAccessor, HostTokenAccessor>();
        services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddEmailSender(configuration, environment);
        services.AddSingleton<IPushNotificationSender, WebPushSender>();
        services.AddHostedService<EventReminderService>();

        services.AddHttpClient<ILetterboxdWatchlistClient, LetterboxdWatchlistClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
        });

        services.AddHttpClient<IGitHubIssueClient, GitHubIssueClient>(client =>
        {
            client.BaseAddress = new Uri("https://api.github.com/");
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
            client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
            client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        });

        RegisterHandlers(services);

        services.AddSingleton<ValidationErrorFilter>();
        services.AddSingleton<MoviePickerExceptionFilter>();

        if (environment.IsDevelopment())
        {
            services.Configure<DevelopmentSeedOptions>(
                configuration.GetSection(DevelopmentSeedOptions.SectionName));
            services.AddHostedService<DevelopmentDataSeedHostedService>();
        }

        return services;
    }

    private static void ConfigureMoviePickerOptions(MoviePickerOptions opts, IConfiguration cfg)
    {
        opts.MongoDbUri = cfg["MONGODB_URI"] ?? string.Empty;
        ConfigureTmdbOptions(opts, cfg);
        ConfigurePosterOptions(opts, cfg);

        var webBase = cfg["PUBLIC_WEB_BASE_URL"];
        if (!string.IsNullOrWhiteSpace(webBase))
            opts.PublicWebBaseUrl = webBase.Trim().TrimEnd('/');

        ConfigureEmailOptions(opts, cfg);
        ConfigureVapidOptions(opts, cfg);

        var kofiToken = cfg["KOFI_WEBHOOK_TOKEN"];
        if (!string.IsNullOrWhiteSpace(kofiToken))
            opts.KofiWebhookToken = kofiToken.Trim();

        ConfigureGitHubOptions(opts, cfg);
    }

    private static void ConfigureGitHubOptions(MoviePickerOptions opts, IConfiguration cfg)
    {
        var token = cfg["GITHUB_TOKEN"];
        opts.GitHubToken = string.IsNullOrWhiteSpace(token) ? null : token.Trim();
        var owner = cfg["GITHUB_REPO_OWNER"];
        if (!string.IsNullOrWhiteSpace(owner))
            opts.GitHubRepoOwner = owner.Trim();
        var repo = cfg["GITHUB_REPO_NAME"];
        if (!string.IsNullOrWhiteSpace(repo))
            opts.GitHubRepoName = repo.Trim();
    }

    private static void ConfigureTmdbOptions(MoviePickerOptions opts, IConfiguration cfg)
    {
        var key = cfg["TMDB_API_KEY"];
        opts.TmdbApiKey = string.IsNullOrWhiteSpace(key) ? null : key;
        var region = cfg["TMDB_WATCH_REGION"];
        opts.TmdbWatchProvidersRegion = string.IsNullOrWhiteSpace(region) ? "FR" : region.Trim();
        if (int.TryParse(cfg["TMDB_ENRICHMENT_CACHE_HOURS"], out var hours) && hours > 0)
            opts.TmdbEnrichmentCacheHours = hours;
        if (int.TryParse(cfg["TMDB_SEARCH_MAX_PROVIDER_LOOKUPS"], out var maxLp) && maxLp >= 0)
            opts.TmdbSearchMaxWatchProviderLookups = maxLp;
        if (int.TryParse(cfg["TMDB_LIST_ENRICHMENT_MAX_PARALLEL"], out var par) && par > 0)
            opts.TmdbListEnrichmentMaxParallelism = Math.Min(par, 16);
    }

    private static void ConfigurePosterOptions(MoviePickerOptions opts, IConfiguration cfg)
    {
        var posterEn = cfg["POSTER_CACHE_ENABLED"];
        opts.PosterCacheEnabled = string.IsNullOrWhiteSpace(posterEn)
            || (posterEn != "0" && !posterEn.Equals("false", StringComparison.OrdinalIgnoreCase));
        if (int.TryParse(cfg["POSTER_CACHE_TTL_DAYS"], out var pttl) && pttl > 0)
            opts.PosterCacheTtlDays = pttl;
        if (int.TryParse(cfg["POSTER_CACHE_MAX_BYTES"], out var pmax) && pmax >= 4096)
            opts.PosterCacheMaxBytes = pmax;
    }

    private static void ConfigureEmailOptions(MoviePickerOptions opts, IConfiguration cfg)
    {
        var emailProvider = cfg["EMAIL_PROVIDER"];
        if (!string.IsNullOrWhiteSpace(emailProvider))
            opts.EmailProvider = emailProvider.Trim().ToLowerInvariant();
        var fromAddress = cfg["EMAIL_FROM_ADDRESS"];
        if (!string.IsNullOrWhiteSpace(fromAddress))
            opts.EmailFromAddress = fromAddress.Trim();
        var fromName = cfg["EMAIL_FROM_NAME"];
        if (!string.IsNullOrWhiteSpace(fromName))
            opts.EmailFromName = fromName.Trim();
        var resendKey = cfg["RESEND_API_KEY"];
        opts.ResendApiKey = string.IsNullOrWhiteSpace(resendKey) ? null : resendKey;
        var resendBase = cfg["RESEND_API_BASE_URL"];
        if (!string.IsNullOrWhiteSpace(resendBase))
            opts.ResendApiBaseUrl = resendBase.Trim().TrimEnd('/');
    }

    private static void ConfigureVapidOptions(MoviePickerOptions opts, IConfiguration cfg)
    {
        var vapidPub = cfg["VAPID_PUBLIC_KEY"];
        if (!string.IsNullOrWhiteSpace(vapidPub))
            opts.VapidPublicKey = StripNonBase64Url(vapidPub);
        var vapidPriv = cfg["VAPID_PRIVATE_KEY"];
        if (!string.IsNullOrWhiteSpace(vapidPriv))
            opts.VapidPrivateKey = StripNonBase64Url(vapidPriv);
        var vapidSubject = cfg["VAPID_SUBJECT"];
        if (!string.IsNullOrWhiteSpace(vapidSubject))
            opts.VapidSubject = vapidSubject.Trim();
    }

    private static void RegisterRepositories(
        IServiceCollection services,
        string mongoUri,
        IHostEnvironment environment)
    {
        if (string.IsNullOrWhiteSpace(mongoUri))
        {
            services.AddSingleton<IEventRepository, InMemoryEventRepository>();
            services.AddSingleton<IParticipantRepository, InMemoryParticipantRepository>();
            services.AddSingleton<IUserRepository, InMemoryUserRepository>();
            services.AddSingleton<IPasswordResetTokenRepository, InMemoryPasswordResetTokenRepository>();
            services.AddSingleton<IMovieRepository, InMemoryMovieRepository>();
            services.AddSingleton<IVoteRepository, InMemoryVoteRepository>();
            services.AddSingleton<ISeenMarkRepository, InMemorySeenMarkRepository>();
            services.AddSingleton<IAuthSessionInvalidator, InMemoryAuthSessionInvalidator>();
            services.AddSingleton<IPushSubscriptionRepository, InMemoryPushSubscriptionRepository>();
            services.AddSingleton<IFollowRepository, InMemoryFollowRepository>();
            services.AddSingleton<IWatchlistRepository, InMemoryWatchlistRepository>();
            services.AddSingleton<IUserNotificationRepository, InMemoryUserNotificationRepository>();
            services.AddSingleton<IKofiWebhookLogRepository, InMemoryKofiWebhookLogRepository>();
            services.AddSingleton<IPushDedupRepository, InMemoryPushDedupRepository>();
            services.AddSingleton<IDatabaseHealthProbe, InMemoryDatabaseHealthProbe>();
            return;
        }

        var mongoUrl = new MongoUrl(mongoUri);
        var databaseName = mongoUrl.DatabaseName ?? "moviepicker";
        if (environment.IsDevelopment()
            && string.Equals(databaseName, "moviepicker", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Garde-fou : en Development, MONGODB_URI cible la base de production 'moviepicker'. "
                + "Utilise une base dédiée et jetable (ex. 'moviepicker_dev'). "
                + "La base 'moviepicker' n'est autorisée qu'en Production.");
        }
        services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoUrl));
        services.AddSingleton<IMongoDatabase>(sp =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            return client.GetDatabase(databaseName);
        });
        services.AddScoped<IEventRepository, MongoEventRepository>();
        services.AddScoped<IParticipantRepository, MongoParticipantRepository>();
        services.AddScoped<IUserRepository, MongoUserRepository>();
        services.AddScoped<IPasswordResetTokenRepository, MongoPasswordResetTokenRepository>();
        services.AddScoped<IMovieRepository, MongoMovieRepository>();
        services.AddScoped<IVoteRepository, MongoVoteRepository>();
        services.AddScoped<ISeenMarkRepository, MongoSeenMarkRepository>();
        services.AddScoped<IAuthSessionInvalidator, MongoAuthSessionInvalidator>();
        services.AddScoped<IPushSubscriptionRepository, MongoPushSubscriptionRepository>();
        services.AddScoped<IFollowRepository, MongoFollowRepository>();
        services.AddScoped<IWatchlistRepository, MongoWatchlistRepository>();
        services.AddScoped<IUserNotificationRepository, MongoUserNotificationRepository>();
        services.AddScoped<IKofiWebhookLogRepository, MongoKofiWebhookLogRepository>();
        services.AddScoped<IPushDedupRepository, MongoPushDedupRepository>();
        services.AddSingleton<IDatabaseHealthProbe, MongoDatabaseHealthProbe>();
        services.AddHostedService<MongoIndexInitializer>();
        services.AddHostedService<UserHandleBackfillService>();
        services.AddHostedService<GenreBackfillService>();
        services.AddHostedService<RuntimeBackfillService>();
    }

    private static void RegisterTmdbSearch(IServiceCollection services, IConfiguration configuration)
    {
        if (string.Equals(configuration["E2E_STUB_TMDB"], "1", StringComparison.Ordinal))
        {
            services.AddSingleton<ITmdbMovieSearch, StubTmdbMovieSearch>();
            return;
        }

        services.AddHttpClient<ITmdbMovieSearch, TmdbMovieSearch>()
            .ConfigurePrimaryHttpMessageHandler(static () => new HttpClientHandler
            {
                AutomaticDecompression = System.Net.DecompressionMethods.GZip
                    | System.Net.DecompressionMethods.Deflate
                    | System.Net.DecompressionMethods.Brotli,
            });
    }

    private static void RegisterPosterStore(
        IServiceCollection services,
        IConfiguration configuration,
        string mongoUri)
    {
        if (!GetPosterCacheEnabledFlag(configuration))
            services.AddSingleton<IPosterImageStore, DisabledPosterImageStore>();
        else if (string.IsNullOrWhiteSpace(mongoUri))
            services.AddSingleton<IPosterImageStore, MemoryPosterImageStore>();
        else
            services.AddSingleton<IPosterImageStore, MongoPosterImageStore>();
    }

    private static bool GetPosterCacheEnabledFlag(IConfiguration configuration)
    {
        var raw = configuration["POSTER_CACHE_ENABLED"];
        if (string.IsNullOrWhiteSpace(raw))
            return true;
        return raw != "0" && !raw.Equals("false", StringComparison.OrdinalIgnoreCase);
    }

    private static void RegisterHandlers(IServiceCollection services)
    {
        services.AddScoped<LetterboxdWatchlistSynchronizer>();
        services.AddScoped<IWinnerAnnouncer, WinnerAnnouncer>();

        var handlerNamespace = "MoviePicker.Api.Application.UseCases";
        var types = typeof(ServiceCollectionExtensions).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false }
                        && t.Namespace is not null
                        && t.Namespace.StartsWith(handlerNamespace, StringComparison.Ordinal)
                        && t.Name.EndsWith("Handler", StringComparison.Ordinal));

        foreach (var type in types)
        {
            var iface = type.GetInterfaces()
                .FirstOrDefault(i => i.Name == $"I{type.Name}");
            if (iface is not null)
                services.AddScoped(iface, type);
        }
    }

    private static string StripNonBase64Url(string s) =>
        new(s.Where(c => c is (>= 'A' and <= 'Z') or (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-' or '_').ToArray());
}
