using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class IdentityBindingConventionTests
{
    private static IEnumerable<Type> Controllers() =>
        typeof(EventsController).Assembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false } && typeof(ControllerBase).IsAssignableFrom(type));

    private static IEnumerable<(Type Controller, MethodInfo Action)> ActionsOf(IEnumerable<Type> controllers) =>
        controllers.SelectMany(controller => controller
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Select(action => (controller, action)));

    private static bool RequiresASignedInUser(Type controller, MethodInfo action) =>
        action.GetCustomAttribute<AllowAnonymousAttribute>() is null
        && (action.GetCustomAttribute<AuthorizeAttribute>() is not null
            || controller.GetCustomAttribute<AuthorizeAttribute>() is not null);

    private static IEnumerable<string> AuthorizedActionsReadingTheAccessor(IEnumerable<Type> controllers) =>
        ActionsOf(controllers)
            .Where(entry => RequiresASignedInUser(entry.Controller, entry.Action))
            .Where(entry => entry.Action.GetParameters().Any(parameter => parameter.ParameterType == typeof(ICurrentUserAccessor)))
            .Select(entry => $"{entry.Controller.Name}.{entry.Action.Name}");

    private static IEnumerable<string> CurrentUserIdsNotBoundToAString(IEnumerable<Type> controllers) =>
        ActionsOf(controllers)
            .SelectMany(entry => entry.Action.GetParameters()
                .Where(parameter => parameter.GetCustomAttribute<CurrentUserIdAttribute>() is not null
                    && parameter.ParameterType != typeof(string))
                .Select(parameter => $"{entry.Controller.Name}.{entry.Action.Name}({parameter.Name})"));

    [Fact]
    public void AnActionBehindAuthorize_TakesTheUserThroughCurrentUserId_NotTheAccessor()
    {
        Assert.Empty(AuthorizedActionsReadingTheAccessor(Controllers()));
    }

    [Fact]
    public void EveryCurrentUserIdParameter_IsAString()
    {
        Assert.Empty(CurrentUserIdsNotBoundToAString(Controllers()));
    }

    [Fact]
    public void AnAuthorizedActionReadingTheAccessor_IsReported_WhileAnAnonymousOneIsNot()
    {
        Assert.Equal(
            [$"{nameof(StrayController)}.{nameof(StrayController.Mine)}"],
            AuthorizedActionsReadingTheAccessor([typeof(StrayController)]));
        Assert.Equal(
            [$"{nameof(StrayController)}.{nameof(StrayController.Count)}(userId)"],
            CurrentUserIdsNotBoundToAString([typeof(StrayController)]));
    }

    [Authorize]
    private sealed class StrayController : ControllerBase
    {
        public OkObjectResult Mine(ICurrentUserAccessor currentUser) => Ok(currentUser.GetUserId());

        [AllowAnonymous]
        public OkObjectResult Preview(ICurrentUserAccessor currentUser) => Ok(currentUser.GetUserId());

        public OkObjectResult Count([CurrentUserId] int userId) => Ok(userId);
    }
}
