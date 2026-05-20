using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Development;
using MoviePicker.Api.Infrastructure.Email;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Infrastructure.Posters;
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
            .Configure<IConfiguration>((opts, cfg) =>
            {
                opts.MongoDbUri = cfg["MONGODB_URI"] ?? string.Empty;
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
                var posterEn = cfg["POSTER_CACHE_ENABLED"];
                opts.PosterCacheEnabled = string.IsNullOrWhiteSpace(posterEn)
                    || (posterEn != "0" && !posterEn.Equals("false", StringComparison.OrdinalIgnoreCase));
                if (int.TryParse(cfg["POSTER_CACHE_TTL_DAYS"], out var pttl) && pttl > 0)
                    opts.PosterCacheTtlDays = pttl;
                if (int.TryParse(cfg["POSTER_CACHE_MAX_BYTES"], out var pmax) && pmax >= 4096)
                    opts.PosterCacheMaxBytes = pmax;
                var webBase = cfg["PUBLIC_WEB_BASE_URL"];
                if (!string.IsNullOrWhiteSpace(webBase))
                    opts.PublicWebBaseUrl = webBase.Trim().TrimEnd('/');
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
            });

        services.AddMemoryCache();

        services.AddCors(o =>
            o.AddPolicy(
                CorsPolicyFront,
                p => p.ConfigureMoviePickerCors(configuration, environment)));

        var mongoUri = configuration["MONGODB_URI"] ?? string.Empty;
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
        }
        else
        {
            var mongoUrl = new MongoUrl(mongoUri);
            services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoUrl));
            services.AddSingleton<IMongoDatabase>(sp =>
            {
                var client = sp.GetRequiredService<IMongoClient>();
                return client.GetDatabase(mongoUrl.DatabaseName ?? "moviepicker");
            });
            services.AddScoped<IEventRepository, MongoEventRepository>();
            services.AddScoped<IParticipantRepository, MongoParticipantRepository>();
            services.AddScoped<IUserRepository, MongoUserRepository>();
            services.AddScoped<IPasswordResetTokenRepository, MongoPasswordResetTokenRepository>();
            services.AddScoped<IMovieRepository, MongoMovieRepository>();
            services.AddScoped<IVoteRepository, MongoVoteRepository>();
            services.AddScoped<ISeenMarkRepository, MongoSeenMarkRepository>();
            services.AddScoped<IAuthSessionInvalidator, MongoAuthSessionInvalidator>();
            services.AddHostedService<MongoIndexInitializer>();
        }

        if (string.Equals(configuration["E2E_STUB_TMDB"], "1", StringComparison.Ordinal))
            services.AddSingleton<ITmdbMovieSearch, StubTmdbMovieSearch>();
        else
            services.AddHttpClient<ITmdbMovieSearch, TmdbMovieSearch>()
                .ConfigurePrimaryHttpMessageHandler(static () => new HttpClientHandler
                {
                    AutomaticDecompression = System.Net.DecompressionMethods.GZip
                        | System.Net.DecompressionMethods.Deflate
                        | System.Net.DecompressionMethods.Brotli,
                });

        services.AddHttpClient(
                PosterFetchHttp.ClientName,
                client =>
                {
                    client.Timeout = TimeSpan.FromSeconds(20);
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
                })
            .ConfigurePrimaryHttpMessageHandler(
                static () => new SocketsHttpHandler { AllowAutoRedirect = false });

        if (!GetPosterCacheEnabledFlag(configuration))
            services.AddSingleton<IPosterImageStore, DisabledPosterImageStore>();
        else if (string.IsNullOrWhiteSpace(mongoUri))
            services.AddSingleton<IPosterImageStore, MemoryPosterImageStore>();
        else
            services.AddSingleton<IPosterImageStore, MongoPosterImageStore>();

        services.AddHttpContextAccessor();
        services.AddScoped<IHostTokenAccessor, HostTokenAccessor>();
        services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddEmailSender(configuration, environment);

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

    private static bool GetPosterCacheEnabledFlag(IConfiguration configuration)
    {
        var raw = configuration["POSTER_CACHE_ENABLED"];
        if (string.IsNullOrWhiteSpace(raw))
            return true;
        return raw != "0" && !raw.Equals("false", StringComparison.OrdinalIgnoreCase);
    }

    private static void RegisterHandlers(IServiceCollection services)
    {
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
}
