using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.Infrastructure.Web;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddMoviePickerAuthentication(this IServiceCollection services)
    {
        services.AddSingleton<ITicketStore>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            if (string.IsNullOrWhiteSpace(config["MONGODB_URI"]))
                return new MemoryAuthTicketStore();
            return new MongoAuthTicketStore(sp.GetRequiredService<IMongoDatabase>());
        });

        services.AddSingleton<IConfigureNamedOptions<CookieAuthenticationOptions>, MoviePickerCookieAuthenticationConfigurer>();

        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme);

        services.AddAuthorization();
        return services;
    }
}
