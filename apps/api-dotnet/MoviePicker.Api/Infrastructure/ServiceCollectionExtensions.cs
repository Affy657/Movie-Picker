using System.Net.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Application.UseCases.Reactions;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
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
            });

        services.AddMemoryCache();

        services.AddCors(o =>
            o.AddPolicy(
                CorsPolicyFront,
                p => p.ConfigureMoviePickerCors(configuration, environment)));

        var mongoUri = configuration["MONGODB_URI"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(mongoUri))
        {
            // Mode test / in-memory : pas de MongoDB
            services.AddSingleton<IEventRepository, InMemoryEventRepository>();
            services.AddSingleton<IParticipantRepository, InMemoryParticipantRepository>();
            services.AddSingleton<IUserRepository, InMemoryUserRepository>();
            services.AddSingleton<IMovieRepository, InMemoryMovieRepository>();
            services.AddSingleton<IVoteRepository, InMemoryVoteRepository>();
            services.AddSingleton<IReactionRepository, InMemoryReactionRepository>();
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
            services.AddScoped<IMovieRepository, MongoMovieRepository>();
            services.AddScoped<IVoteRepository, MongoVoteRepository>();
            services.AddScoped<IReactionRepository, MongoReactionRepository>();
            services.AddHostedService<MongoIndexInitializer>();
        }

        if (string.Equals(configuration["E2E_STUB_TMDB"], "1", StringComparison.Ordinal))
            services.AddSingleton<ITmdbMovieSearch, StubTmdbMovieSearch>();
        else
            services.AddHttpClient<ITmdbMovieSearch, TmdbMovieSearch>();

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

        services.AddScoped<ICreateEventHandler, CreateEventHandler>();
        services.AddScoped<IGetEventDetailHandler, GetEventDetailHandler>();
        services.AddScoped<IGetEventConfigHandler, GetEventConfigHandler>();
        services.AddScoped<IPatchEventConfigHandler, PatchEventConfigHandler>();
        services.AddScoped<IJoinEventHandler, JoinEventHandler>();
        services.AddScoped<IListMyEventsHandler, ListMyEventsHandler>();
        services.AddScoped<ISearchMoviesHandler, SearchMoviesHandler>();
        services.AddScoped<IListMoviesForEventHandler, ListMoviesForEventHandler>();
        services.AddScoped<IAddMovieHandler, AddMovieHandler>();
        services.AddScoped<IDeleteMovieHandler, DeleteMovieHandler>();
        services.AddScoped<IVoteMovieHandler, VoteMovieHandler>();
        services.AddScoped<IAddReactionHandler, AddReactionHandler>();
        services.AddScoped<IRemoveReactionHandler, RemoveReactionHandler>();
        services.AddScoped<IGetMovieReactionsHandler, GetMovieReactionsHandler>();
        services.AddScoped<ILaunchWheelHandler, LaunchWheelHandler>();
        services.AddScoped<ICloseEventHandler, CloseEventHandler>();

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IRegisterUserHandler, RegisterUserHandler>();
        services.AddScoped<ILoginUserHandler, LoginUserHandler>();
        services.AddScoped<IGetUserProfileHandler, GetUserProfileHandler>();
        services.AddScoped<IPatchUserProfileHandler, PatchUserProfileHandler>();

        services.AddSingleton<ValidationErrorFilter>();
        services.AddSingleton<MoviePickerExceptionFilter>();

        return services;
    }

    private static bool GetPosterCacheEnabledFlag(IConfiguration configuration)
    {
        var raw = configuration["POSTER_CACHE_ENABLED"];
        if (string.IsNullOrWhiteSpace(raw))
            return true;
        return raw != "0" && !raw.Equals("false", StringComparison.OrdinalIgnoreCase);
    }
}
