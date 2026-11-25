using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

public static class GenericApiErrors
{
    private const string BadRequest = "Bad request";
    private const string AuthenticationRequired = "Authentication required";
    private const string AccessDenied = "Access denied";
    private const string ResourceNotFound = "Resource not found";
    private const string MethodNotAllowed = "Method not allowed";
    private const string TooManyRequests = "Too many requests, please retry in a moment";
    private const string RequestFailed = "Request failed";

    public static (string Message, string? Reason) Describe(int status) => status switch
    {
        StatusCodes.Status400BadRequest => (BadRequest, ErrorCodes.ValidationFailed),
        StatusCodes.Status401Unauthorized => (AuthenticationRequired, ErrorCodes.Unauthorized),
        StatusCodes.Status403Forbidden => (AccessDenied, ErrorCodes.Forbidden),
        StatusCodes.Status404NotFound => (ResourceNotFound, ErrorCodes.NotFound),
        StatusCodes.Status405MethodNotAllowed => (MethodNotAllowed, null),
        StatusCodes.Status429TooManyRequests => (TooManyRequests, ErrorCodes.RateLimited),
        _ => (RequestFailed, null)
    };

    public static string Json(HttpContext httpContext, int status)
    {
        var (message, reason) = Describe(status);
        return ApiErrorJson.Serialize(httpContext, status, message, reason);
    }
}
