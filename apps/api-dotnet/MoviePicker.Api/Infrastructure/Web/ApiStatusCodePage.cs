using Microsoft.AspNetCore.Diagnostics;

namespace MoviePicker.Api.Infrastructure.Web;

public static class ApiStatusCodePage
{
    public static async Task WriteAsync(StatusCodeContext context)
    {
        var response = context.HttpContext.Response;
        if (response.StatusCode < StatusCodes.Status400BadRequest
            || response.HasStarted
            || !string.IsNullOrEmpty(response.ContentType))
        {
            return;
        }

        response.ContentType = "application/json";
        await response.WriteAsync(GenericApiErrors.Json(context.HttpContext, response.StatusCode));
    }
}
