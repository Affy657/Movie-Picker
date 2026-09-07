using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Web;

[AttributeUsage(AttributeTargets.Method)]
public sealed class SharedRateLimitAttribute : Attribute
{
    public SharedRateLimitAttribute(string policyName) => PolicyName = policyName;

    public string PolicyName { get; }
}

public sealed class SharedRateLimitFilter : IAsyncActionFilter
{
    private readonly IRateLimitCounterStore _counters;
    private readonly TimeProvider _clock;
    private readonly bool _isDisabled;
    private readonly ILogger<SharedRateLimitFilter> _logger;

    public SharedRateLimitFilter(
        IRateLimitCounterStore counters,
        TimeProvider clock,
        IHostEnvironment environment,
        ILogger<SharedRateLimitFilter> logger)
    {
        _counters = counters;
        _clock = clock;
        _isDisabled = environment.IsDevelopment();
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (_isDisabled)
        {
            await next();
            return;
        }

        var attribute = context.ActionDescriptor.EndpointMetadata
            .OfType<SharedRateLimitAttribute>()
            .FirstOrDefault();

        if (attribute is null)
        {
            await next();
            return;
        }

        var spec = RateLimitingExtensions.FindPolicy(attribute.PolicyName);
        if (spec is not { } policy)
        {
            await next();
            return;
        }

        var now = _clock.GetUtcNow();
        var window = TimeSpan.FromMinutes(policy.WindowMinutes);
        var windowStartTicks = now.UtcTicks / window.Ticks;
        var partitionKey = RateLimitingExtensions.PartitionKeyFor(context.HttpContext, policy);
        var counterKey = $"{policy.Name}|{partitionKey}|{windowStartTicks}";
        var windowEnd = new DateTimeOffset((windowStartTicks + 1) * window.Ticks, TimeSpan.Zero);

        long used;
        try
        {
            used = await _counters.IncrementAsync(counterKey, windowEnd, context.HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Compteur de quota partagé indisponible pour {Policy}", policy.Name);
            await next();
            return;
        }

        if (used <= policy.PermitLimit)
        {
            await next();
            return;
        }

        var retryAfter = Math.Max(1, (int)Math.Ceiling((windowEnd - now).TotalSeconds));
        context.HttpContext.Response.Headers.RetryAfter =
            retryAfter.ToString(CultureInfo.InvariantCulture);
        context.HttpContext.Response.ContentType = "application/json";
        context.Result = new ContentResult
        {
            StatusCode = StatusCodes.Status429TooManyRequests,
            ContentType = "application/json",
            Content = ApiErrorJson.Serialize(
                context.HttpContext,
                StatusCodes.Status429TooManyRequests,
                "Trop de requêtes. Réessayez dans un instant.")
        };
    }
}
