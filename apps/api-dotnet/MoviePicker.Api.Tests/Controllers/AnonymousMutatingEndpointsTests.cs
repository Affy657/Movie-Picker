using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class AnonymousMutatingEndpointsTests
{
    private static readonly Type[] MutatingVerbs =
    [
        typeof(HttpPostAttribute),
        typeof(HttpPutAttribute),
        typeof(HttpPatchAttribute),
        typeof(HttpDeleteAttribute)
    ];

    private static readonly string[] PublicAccountActions =
    [
        "AuthController.ConfirmPasswordReset",
        "AuthController.Login",
        "AuthController.Register",
        "AuthController.RequestPasswordReset"
    ];

    private static readonly string[] HostTokenActions =
    [
        "EventsController.AnnounceWheelWinner",
        "EventsController.Close",
        "EventsController.PatchConfig",
        "EventsController.RemoveParticipant",
        "EventsController.RemoveWinner",
        "EventsController.ResetWheel",
        "EventsController.SetManualWinner",
        "EventsController.Wheel"
    ];

    private static readonly string[] SignedMachineCallbacks =
    [
        "KofiWebhookController.Receive",
        "SchedulerController.RunCatalogWarmUp",
        "SchedulerController.RunEventReminders",
        "SchedulerController.RunFinishedEvents",
        "SchedulerController.RunRatingReminders",
        "SchedulerController.RunRecurringEvents"
    ];

    private static bool AcceptsAnonymousCallers(MethodInfo action)
    {
        var controller = action.DeclaringType!;
        if (action.GetCustomAttribute<AllowAnonymousAttribute>() is not null
            || controller.GetCustomAttribute<AllowAnonymousAttribute>() is not null)
            return true;

        return action.GetCustomAttribute<AuthorizeAttribute>() is null
            && controller.GetCustomAttribute<AuthorizeAttribute>() is null;
    }

    [Fact]
    public void EveryAnonymousMutatingAction_IsDeclaredOnPurpose()
    {
        var controllers = typeof(Program).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(ControllerBase).IsAssignableFrom(t));

        var anonymous = controllers
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Where(m => m.GetCustomAttributes().Any(a => MutatingVerbs.Contains(a.GetType())))
            .Where(AcceptsAnonymousCallers)
            .Select(m => $"{m.DeclaringType!.Name}.{m.Name}")
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        var declared = PublicAccountActions
            .Concat(HostTokenActions)
            .Concat(SignedMachineCallbacks)
            .OrderBy(name => name, StringComparer.Ordinal);
        Assert.Equal(declared, anonymous);
    }
}
