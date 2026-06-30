using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ValidationErrorFilterTests
{
    private static ActionExecutingContext Context(ModelStateDictionary modelState, HttpContext? http = null)
    {
        var actionContext = new ActionContext(
            http ?? new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor(),
            modelState);
        return new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            controller: new object());
    }

    [Fact]
    public void OnActionExecuting_ValidModelState_DoesNothing()
    {
        var ctx = Context(new ModelStateDictionary());

        new ValidationErrorFilter().OnActionExecuting(ctx);

        Assert.Null(ctx.Result);
    }

    [Fact]
    public void OnActionExecuting_InvalidModelState_SetsBadRequestWithJoinedErrors()
    {
        var http = new DefaultHttpContext();
        http.Items[CorrelationIdConstants.ItemKey] = "req-1";
        var modelState = new ModelStateDictionary();
        modelState.AddModelError("Title", "Titre requis");
        modelState.AddModelError("Date", "Date invalide");

        var ctx = Context(modelState, http);
        new ValidationErrorFilter().OnActionExecuting(ctx);

        var bad = Assert.IsType<BadRequestObjectResult>(ctx.Result);
        var body = Assert.IsType<ApiErrorResponse>(bad.Value);
        Assert.Equal(400, body.Code);
        Assert.Equal("req-1", body.RequestId);
        Assert.Contains("Titre requis", body.Error);
        Assert.Contains("Date invalide", body.Error);
    }

    [Fact]
    public void OnActionExecuting_InvalidWithoutMessages_UsesFallbackMessage()
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError("x", string.Empty);

        var ctx = Context(modelState);
        new ValidationErrorFilter().OnActionExecuting(ctx);

        var bad = Assert.IsType<BadRequestObjectResult>(ctx.Result);
        var body = Assert.IsType<ApiErrorResponse>(bad.Value);
        Assert.Equal("Validation échouée", body.Error);
    }
}
