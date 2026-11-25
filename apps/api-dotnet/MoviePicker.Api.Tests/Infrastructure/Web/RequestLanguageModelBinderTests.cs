using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Net.Http.Headers;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class RequestLanguageModelBinderTests
{
    private static DefaultModelBindingContext BindingContextFor(string? acceptLanguage)
    {
        var httpContext = new DefaultHttpContext();
        if (acceptLanguage is not null)
            httpContext.Request.Headers.AcceptLanguage = acceptLanguage;
        var metadata = new EmptyModelMetadataProvider().GetMetadataForType(typeof(CatalogLanguage));
        return new DefaultModelBindingContext
        {
            ActionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor()),
            ModelMetadata = metadata,
            ModelName = "language",
            ModelState = new ModelStateDictionary(),
            ValueProvider = new CompositeValueProvider(),
        };
    }

    private static async Task<object?> BindAsync(string? acceptLanguage)
    {
        var context = BindingContextFor(acceptLanguage);
        await new RequestLanguageModelBinder().BindModelAsync(context);
        Assert.True(context.Result.IsModelSet);
        return context.Result.Model;
    }

    [Theory]
    [InlineData("en-US", CatalogLanguage.English)]
    [InlineData("fr-FR", CatalogLanguage.French)]
    [InlineData("de-DE,en;q=0.8,fr;q=0.5", CatalogLanguage.English)]
    [InlineData("fr;q=0.4,en-GB;q=0.9", CatalogLanguage.English)]
    [InlineData("en;q=0.2,fr-FR", CatalogLanguage.French)]
    public async Task BindModelAsync_FollowsTheFirstSupportedPreference(string header, CatalogLanguage expected) =>
        Assert.Equal(expected, await BindAsync(header));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("*")]
    [InlineData("de-DE,es;q=0.9")]
    [InlineData("not a language;;")]
    public async Task BindModelAsync_AnythingElse_FallsBackToFrench(string? header) =>
        Assert.Equal(CatalogLanguage.French, await BindAsync(header));

    [Fact]
    public async Task BindModelAsync_DeclaresThatTheResponseVariesWithTheLanguage()
    {
        var context = BindingContextFor("en-US");

        await new RequestLanguageModelBinder().BindModelAsync(context);

        Assert.Contains(
            context.HttpContext.Response.Headers.Vary.SelectMany(value => (value ?? string.Empty).Split(',')),
            value => value.Trim() == HeaderNames.AcceptLanguage);
    }

    [Fact]
    public void Attribute_BindsFromTheRequestWithoutAppearingInTheContract()
    {
        var attribute = new RequestLanguageAttribute();

        Assert.Equal(BindingSource.Special, attribute.BindingSource);
        Assert.Equal(typeof(RequestLanguageModelBinder), attribute.BinderType);
    }
}
