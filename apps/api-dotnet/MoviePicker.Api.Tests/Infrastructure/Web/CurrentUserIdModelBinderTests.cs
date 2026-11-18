using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CurrentUserIdModelBinderTests
{
    private static DefaultModelBindingContext BindingContextFor(ClaimsPrincipal user)
    {
        var httpContext = new DefaultHttpContext { User = user };
        var metadata = new EmptyModelMetadataProvider().GetMetadataForType(typeof(string));
        return new DefaultModelBindingContext
        {
            ActionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor()),
            ModelMetadata = metadata,
            ModelName = "userId",
            ModelState = new ModelStateDictionary(),
            ValueProvider = new CompositeValueProvider(),
        };
    }

    [Fact]
    public async Task BindModelAsync_ASignedInUser_BindsTheirId()
    {
        var context = BindingContextFor(ControllerTestHelpers.AuthenticatedUser("u1"));

        await new CurrentUserIdModelBinder().BindModelAsync(context);

        Assert.True(context.Result.IsModelSet);
        Assert.Equal("u1", context.Result.Model);
    }

    [Fact]
    public async Task BindModelAsync_AnAnonymousCaller_IsRefused()
    {
        var context = BindingContextFor(new ClaimsPrincipal(new ClaimsIdentity()));

        await Assert.ThrowsAsync<MissingUserIdentityException>(() => new CurrentUserIdModelBinder().BindModelAsync(context));
    }

    [Fact]
    public async Task BindModelAsync_AnUnauthenticatedIdentityCarryingAnId_IsRefused()
    {
        var context = BindingContextFor(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "u1")])));

        await Assert.ThrowsAsync<MissingUserIdentityException>(() => new CurrentUserIdModelBinder().BindModelAsync(context));
    }

    [Fact]
    public async Task BindModelAsync_ASignedInIdentityWithoutAnId_IsRefused()
    {
        var context = BindingContextFor(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "Tester")], "Cookies")));

        await Assert.ThrowsAsync<MissingUserIdentityException>(() => new CurrentUserIdModelBinder().BindModelAsync(context));
    }

    [Fact]
    public void TheAttribute_BindsOutsideTheRequest_SoTheContractDoesNotShowTheParameter()
    {
        var attribute = new CurrentUserIdAttribute();

        Assert.Equal(BindingSource.Special, attribute.BindingSource);
        Assert.False(attribute.BindingSource.IsFromRequest);
        Assert.Equal(typeof(CurrentUserIdModelBinder), attribute.BinderType);
    }
}
