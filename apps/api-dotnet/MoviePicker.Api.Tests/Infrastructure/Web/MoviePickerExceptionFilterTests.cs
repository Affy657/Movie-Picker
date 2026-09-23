using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class MoviePickerExceptionFilterTests
{
    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public string ApplicationName { get; set; } = "";
        public string EnvironmentName { get; set; } = "Production";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static ExceptionContext CreateContext(Exception ex)
    {
        var actionContext = new ActionContext(
            new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor(),
            new ModelStateDictionary());
        return new ExceptionContext(actionContext, []) { Exception = ex };
    }

    [Fact]
    public void OnException_RequestCancelled_LeavesTheExceptionToTheTimeoutAndAbortHandling()
    {
        var filter = new MoviePickerExceptionFilter(new StubHostEnvironment());
        var context = CreateContext(new OperationCanceledException());
        using var aborted = new CancellationTokenSource();
        aborted.Cancel();
        context.HttpContext.RequestAborted = aborted.Token;

        filter.OnException(context);

        Assert.False(context.ExceptionHandled);
        Assert.Null(context.Result);
    }

    [Fact]
    public void OnException_CancellationWhileTheRequestIsAlive_IsAnInternalError()
    {
        var filter = new MoviePickerExceptionFilter(new StubHostEnvironment());
        var context = CreateContext(new TaskCanceledException("outbound call timed out"));

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        Assert.Equal(500, Assert.IsType<JsonResult>(context.Result).StatusCode);
    }

    [Fact]
    public void OnException_NotFoundException_Sets404AndJsonError()
    {
        var env = new StubHostEnvironment { EnvironmentName = "Production" };
        var filter = new MoviePickerExceptionFilter(env);
        var context = CreateContext(Errors.EventNotFound());

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = context.Result as JsonResult;
        Assert.NotNull(result);
        Assert.Equal(404, result!.StatusCode);
        var data = result.Value;
        var errorProp = data?.GetType().GetProperty(nameof(ApiErrorResponse.Error));
        Assert.NotNull(errorProp);
        Assert.Equal("Movie night not found", errorProp.GetValue(data)?.ToString());
        var codeProp = data?.GetType().GetProperty(nameof(ApiErrorResponse.Code));
        Assert.NotNull(codeProp);
        Assert.Equal(404, codeProp.GetValue(data));
    }

    [Fact]
    public void OnException_ConflictWithReason_CarriesTheReasonInTheEnvelope()
    {
        var filter = new MoviePickerExceptionFilter(new StubHostEnvironment { EnvironmentName = "Production" });
        var context = CreateContext(new ConflictException("Limite atteinte.", "vote-limit-reached"));

        filter.OnException(context);

        var result = Assert.IsType<JsonResult>(context.Result);
        Assert.Equal(409, result.StatusCode);
        var envelope = Assert.IsType<ApiErrorResponse>(result.Value);
        Assert.Equal("vote-limit-reached", envelope.Reason);
    }

    [Fact]
    public void OnException_ConflictWithoutReason_LeavesTheReasonEmpty()
    {
        var filter = new MoviePickerExceptionFilter(new StubHostEnvironment { EnvironmentName = "Production" });
        var context = CreateContext(new ConflictException("Soirée terminée."));

        filter.OnException(context);

        var envelope = Assert.IsType<ApiErrorResponse>(Assert.IsType<JsonResult>(context.Result).Value);
        Assert.Null(envelope.Reason);
    }

    [Fact]
    public void OnException_ForbiddenException_Sets403()
    {
        var env = new StubHostEnvironment();
        var filter = new MoviePickerExceptionFilter(env);
        var context = CreateContext(new ForbiddenException("Réservé à l'hôte"));

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = context.Result as JsonResult;
        Assert.Equal(403, result!.StatusCode);
    }

    [Fact]
    public void OnException_ServiceUnavailableException_Sets503()
    {
        var env = new StubHostEnvironment();
        var filter = new MoviePickerExceptionFilter(env);
        var context = CreateContext(new ServiceUnavailableException("Recherche films temporairement indisponible"));

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = context.Result as JsonResult;
        Assert.NotNull(result);
        Assert.Equal((int)HttpStatusCode.ServiceUnavailable, result!.StatusCode);
        var errorProp = result.Value?.GetType().GetProperty(nameof(ApiErrorResponse.Error));
        Assert.Equal("Recherche films temporairement indisponible", errorProp?.GetValue(result.Value)?.ToString());
    }

    [Fact]
    public void OnException_ArgumentException_IsAProgrammingError_Returns500()
    {
        var env = new StubHostEnvironment();
        var filter = new MoviePickerExceptionFilter(env);
        var context = CreateContext(new ArgumentException("Invalid arg"));

        filter.OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = context.Result as JsonResult;
        Assert.Equal((int)HttpStatusCode.InternalServerError, result!.StatusCode);
    }

    [Fact]
    public void OnException_GenericException_Development_ReturnsMessage()
    {
        var env = new StubHostEnvironment { EnvironmentName = "Development" };
        var filter = new MoviePickerExceptionFilter(env);
        var context = CreateContext(new InvalidOperationException("Secret detail"));

        filter.OnException(context);

        var result = context.Result as JsonResult;
        var errorProp = result?.Value?.GetType().GetProperty(nameof(ApiErrorResponse.Error));
        Assert.Equal("Secret detail", errorProp?.GetValue(result!.Value)?.ToString());
    }

    [Fact]
    public void OnException_GenericException_Returns500WithErrorBody()
    {
        var env = new StubHostEnvironment { EnvironmentName = "Production" };
        var filter = new MoviePickerExceptionFilter(env);
        var context = CreateContext(new InvalidCastException("Secret detail"));

        filter.OnException(context);

        var result = context.Result as JsonResult;
        Assert.NotNull(result);
        Assert.Equal((int)HttpStatusCode.InternalServerError, result!.StatusCode);
        var errorProp = result.Value?.GetType().GetProperty(nameof(ApiErrorResponse.Error));
        Assert.NotNull(errorProp);
        Assert.NotNull(errorProp.GetValue(result.Value));
        var codeProp = result.Value?.GetType().GetProperty(nameof(ApiErrorResponse.Code));
        Assert.Equal(500, codeProp?.GetValue(result.Value));
    }
}
