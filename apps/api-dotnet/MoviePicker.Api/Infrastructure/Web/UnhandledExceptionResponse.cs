using Microsoft.AspNetCore.Diagnostics;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

public static class UnhandledExceptionResponse
{
    public static async Task WriteAsync(HttpContext context)
    {
        if (context.Features.Get<IExceptionHandlerFeature>()?.Error is { } error)
        {
            context.RequestServices
                .GetRequiredService<ILoggerFactory>()
                .CreateLogger(typeof(UnhandledExceptionResponse))
                .LogError(error, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path.Value);
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            ApiErrorJson.Serialize(
                context,
                StatusCodes.Status500InternalServerError,
                "Internal server error",
                ErrorCodes.InternalError),
            context.RequestAborted);
    }
}
