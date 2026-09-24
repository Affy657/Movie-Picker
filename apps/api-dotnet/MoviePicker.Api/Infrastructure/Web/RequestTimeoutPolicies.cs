using Microsoft.AspNetCore.Http.Timeouts;

namespace MoviePicker.Api.Infrastructure.Web;

public static class RequestTimeoutPolicies
{
    public const string LongRunning = "long-running";

    public static readonly TimeSpan Default = TimeSpan.FromSeconds(30);

    public static readonly TimeSpan LongRunningBudget = TimeSpan.FromSeconds(280);

    public static IServiceCollection AddMoviePickerRequestTimeouts(this IServiceCollection services) =>
        services.AddRequestTimeouts(options =>
        {
            options.DefaultPolicy = new RequestTimeoutPolicy
            {
                Timeout = Default,
                TimeoutStatusCode = StatusCodes.Status503ServiceUnavailable
            };
            options.AddPolicy(LongRunning, new RequestTimeoutPolicy
            {
                Timeout = LongRunningBudget,
                TimeoutStatusCode = StatusCodes.Status503ServiceUnavailable
            });
        });
}
