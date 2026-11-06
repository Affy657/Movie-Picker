using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
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

        var attributes = context.ActionDescriptor.EndpointMetadata.OfType<SharedRateLimitAttribute>();
        foreach (var attribute in attributes)
        {
            if (RateLimitingExtensions.FindPolicy(attribute.PolicyName) is { } policy
                && AppliesTo(context.HttpContext.Request, policy)
                && await RefuseIfOverQuotaAsync(context, policy))
                return;
        }

        await next();
    }

    private static bool AppliesTo(HttpRequest request, RateLimitingExtensions.PolicySpec policy) =>
        policy.Name != RateLimitingExtensions.MovieShowcaseFreeKeyHourlyPolicy
        || ShowcaseFreeKey.IsRequestedBy(request);

    private async Task<bool> RefuseIfOverQuotaAsync(
        ActionExecutingContext context,
        RateLimitingExtensions.PolicySpec policy)
    {
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
            _logger.LogWarning(ex, "Shared quota counter unavailable for {Policy}", policy.Name);
            return false;
        }

        if (used <= policy.PermitLimit)
            return false;

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
                "Too many requests, please retry in a moment",
                ErrorCodes.RateLimited)
        };
        return true;
    }
}
