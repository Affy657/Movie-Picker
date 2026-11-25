using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class GenericApiErrorsTests
{
    [Theory]
    [InlineData(StatusCodes.Status400BadRequest, "Bad request", ErrorCodes.ValidationFailed)]
    [InlineData(StatusCodes.Status401Unauthorized, "Authentication required", ErrorCodes.Unauthorized)]
    [InlineData(StatusCodes.Status403Forbidden, "Access denied", ErrorCodes.Forbidden)]
    [InlineData(StatusCodes.Status404NotFound, "Resource not found", ErrorCodes.NotFound)]
    [InlineData(StatusCodes.Status405MethodNotAllowed, "Method not allowed", null)]
    [InlineData(StatusCodes.Status429TooManyRequests, "Too many requests, please retry in a moment", ErrorCodes.RateLimited)]
    [InlineData(StatusCodes.Status409Conflict, "Request failed", null)]
    public void Describe_GivesEachStatusItsOneMessageAndReason(int status, string message, string? reason)
    {
        Assert.Equal((message, reason), GenericApiErrors.Describe(status));
    }

    [Fact]
    public void Json_WritesTheEnvelopeOfTheTable()
    {
        var json = GenericApiErrors.Json(new DefaultHttpContext(), StatusCodes.Status429TooManyRequests);

        Assert.Contains("\"error\":\"Too many requests, please retry in a moment\"", json, StringComparison.Ordinal);
        Assert.Contains($"\"reason\":\"{ErrorCodes.RateLimited}\"", json, StringComparison.Ordinal);
        Assert.Contains("\"code\":429", json, StringComparison.Ordinal);
    }
}
