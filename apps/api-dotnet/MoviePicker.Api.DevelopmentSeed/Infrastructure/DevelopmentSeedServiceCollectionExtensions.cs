using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Development;

namespace MoviePicker.Api.Infrastructure;

public static class DevelopmentSeedServiceCollectionExtensions
{
    public static IServiceCollection AddDevelopmentSeed(this IServiceCollection services, IConfiguration configuration)
    {
        if (services.Any(d => d.ImplementationType == typeof(DevelopmentDataSeedHostedService)))
            return services;

        services.Configure<DevelopmentSeedOptions>(configuration.GetSection(DevelopmentSeedOptions.SectionName));
        services.AddHostedService<DevelopmentDataSeedHostedService>();
        return services;
    }
}
