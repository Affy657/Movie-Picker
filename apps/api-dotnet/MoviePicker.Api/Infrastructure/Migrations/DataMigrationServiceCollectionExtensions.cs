using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Migrations;

public static class DataMigrationServiceCollectionExtensions
{
    public static IServiceCollection AddDataMigrations(this IServiceCollection services)
    {
        services.AddScoped<IDataMigration, AssignMissingUserHandlesMigration>();
        services.AddScoped<IDataMigration, BackfillMovieGenresMigration>();
        services.AddScoped<IDataMigration, BackfillWatchlistRuntimesMigration>();
        services.AddHostedService<DataMigrationRunner>();
        return services;
    }
}
