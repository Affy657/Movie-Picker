using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
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
            });

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
            services.AddSingleton<IMovieRepository, InMemoryMovieRepository>();
            services.AddSingleton<IVoteRepository, InMemoryVoteRepository>();
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
            services.AddScoped<IMovieRepository, MongoMovieRepository>();
            services.AddScoped<IVoteRepository, MongoVoteRepository>();
        }

        if (string.Equals(configuration["E2E_STUB_TMDB"], "1", StringComparison.Ordinal))
            services.AddSingleton<ITmdbMovieSearch, StubTmdbMovieSearch>();
        else
            services.AddHttpClient<ITmdbMovieSearch, TmdbMovieSearch>();

        services.AddHttpContextAccessor();
        services.AddScoped<IHostTokenAccessor, HostTokenAccessor>();

        services.AddScoped<ICreateEventHandler, CreateEventHandler>();
        services.AddScoped<IGetEventDetailHandler, GetEventDetailHandler>();
        services.AddScoped<IJoinEventHandler, JoinEventHandler>();
        services.AddScoped<ISearchMoviesHandler, SearchMoviesHandler>();
        services.AddScoped<IListMoviesForEventHandler, ListMoviesForEventHandler>();
        services.AddScoped<IAddMovieHandler, AddMovieHandler>();
        services.AddScoped<IDeleteMovieHandler, DeleteMovieHandler>();
        services.AddScoped<IVoteMovieHandler, VoteMovieHandler>();
        services.AddScoped<ILaunchWheelHandler, LaunchWheelHandler>();
        services.AddScoped<ICloseEventHandler, CloseEventHandler>();

        services.AddSingleton<ValidationErrorFilter>();
        services.AddSingleton<MoviePickerExceptionFilter>();

        return services;
    }
}
