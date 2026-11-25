using Microsoft.AspNetCore.HttpOverrides;

namespace MoviePicker.Api.Infrastructure.Web;

public static class ForwardedHeadersServiceCollectionExtensions
{
    public static IServiceCollection AddMoviePickerForwardedHeaders(this IServiceCollection services) =>
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 1;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
        });
}
