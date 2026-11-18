using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Routing;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ApiErrorClientErrorFactoryTests
{
    private static (int? Status, ApiErrorResponse Error) ConvertBare(IClientErrorActionResult bareResult)
    {
        var context = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        var result = Assert.IsType<JsonResult>(new ApiErrorClientErrorFactory().GetClientError(context, bareResult));
        return (result.StatusCode, Assert.IsType<ApiErrorResponse>(result.Value));
    }

    [Theory]
    [InlineData(StatusCodes.Status400BadRequest, ErrorCodes.ValidationFailed)]
    [InlineData(StatusCodes.Status401Unauthorized, ErrorCodes.Unauthorized)]
    [InlineData(StatusCodes.Status403Forbidden, ErrorCodes.Forbidden)]
    [InlineData(StatusCodes.Status404NotFound, ErrorCodes.NotFound)]
    [InlineData(StatusCodes.Status429TooManyRequests, ErrorCodes.RateLimited)]
    public void ABareClientError_BecomesTheApiErrorEnvelope_WithItsStatusAndReason(int status, string reason)
    {
        var (written, error) = ConvertBare(new StatusCodeResult(status));

        Assert.Equal(status, written);
        Assert.Equal(status, error.Code);
        Assert.Equal(reason, error.Reason);
        Assert.False(string.IsNullOrWhiteSpace(error.Error));
    }

    [Fact]
    public void TheResultsControllersReturn_AreConvertedLikeTheirStatus()
    {
        Assert.Equal(ErrorCodes.Unauthorized, ConvertBare(new UnauthorizedResult()).Error.Reason);
        Assert.Equal(ErrorCodes.NotFound, ConvertBare(new NotFoundResult()).Error.Reason);
    }

    [Fact]
    public void AnotherClientError_KeepsItsStatus_WithoutAReasonTheFrontWouldTranslate()
    {
        var (written, error) = ConvertBare(new ConflictResult());

        Assert.Equal(StatusCodes.Status409Conflict, written);
        Assert.Equal(StatusCodes.Status409Conflict, error.Code);
        Assert.Null(error.Reason);
    }
}
