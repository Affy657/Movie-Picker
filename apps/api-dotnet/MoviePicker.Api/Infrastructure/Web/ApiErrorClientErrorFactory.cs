using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class ApiErrorClientErrorFactory : IClientErrorFactory
{
    public IActionResult GetClientError(ActionContext actionContext, IClientErrorActionResult clientError)
    {
        var status = clientError.StatusCode ?? StatusCodes.Status400BadRequest;
        var (message, reason) = Describe(status);
        return new JsonResult(ApiErrorResponse.FromHttpContext(actionContext.HttpContext, status, message, reason))
        {
            StatusCode = status
        };
    }

    private static (string Message, string? Reason) Describe(int status) => status switch
    {
        StatusCodes.Status400BadRequest => ("Bad request", ErrorCodes.ValidationFailed),
        StatusCodes.Status401Unauthorized => ("Authentication required", ErrorCodes.Unauthorized),
        StatusCodes.Status403Forbidden => ("Access denied", ErrorCodes.Forbidden),
        StatusCodes.Status404NotFound => ("Resource not found", ErrorCodes.NotFound),
        StatusCodes.Status429TooManyRequests => ("Too many requests, please retry in a moment", ErrorCodes.RateLimited),
        _ => ("Request failed", null)
    };
}
