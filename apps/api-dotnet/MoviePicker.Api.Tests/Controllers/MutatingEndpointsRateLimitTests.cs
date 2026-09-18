using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MutatingEndpointsRateLimitTests
{
    private static readonly Type[] MutatingVerbs =
    [
        typeof(HttpPostAttribute),
        typeof(HttpPutAttribute),
        typeof(HttpPatchAttribute),
        typeof(HttpDeleteAttribute)
    ];

    [Fact]
    public void EveryMutatingAction_DeclaresARateLimitingPolicy()
    {
        var controllers = typeof(Program).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(ControllerBase).IsAssignableFrom(t));

        var unguarded = controllers
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Where(m => m.GetCustomAttributes().Any(a => MutatingVerbs.Contains(a.GetType())))
            .Where(m => m.GetCustomAttribute<EnableRateLimitingAttribute>() is null)
            .Select(m => $"{m.DeclaringType!.Name}.{m.Name}")
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        Assert.Empty(unguarded);
    }

    private static readonly string[] SharedResourcePolicies =
    [
        RateLimitingExtensions.CreateEventPolicy,
        RateLimitingExtensions.KofiWebhookPolicy,
        RateLimitingExtensions.SchedulerPolicy,
        RateLimitingExtensions.IdeaSuggestionPolicy
    ];

    [Fact]
    public void EveryActionOnASharedResource_CountsItsQuotaAcrossInstances()
    {
        var controllers = typeof(Program).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(ControllerBase).IsAssignableFrom(t));

        var perInstanceOnly = controllers
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Where(m => SharedResourcePolicies.Contains(m.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName))
            .Where(m => m.GetCustomAttribute<SharedRateLimitAttribute>()?.PolicyName
                != m.GetCustomAttribute<EnableRateLimitingAttribute>()!.PolicyName)
            .Select(m => $"{m.DeclaringType!.Name}.{m.Name}")
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        Assert.Empty(perInstanceOnly);
    }
}
