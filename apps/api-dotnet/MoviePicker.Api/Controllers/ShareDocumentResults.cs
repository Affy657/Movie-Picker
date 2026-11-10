using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Controllers;

internal static class ShareDocumentResults
{
    public static string PublicApiBase(this ControllerBase controller)
    {
        var request = controller.Request;
        return $"{request.Scheme}://{request.Host.Value}{request.PathBase.Value}";
    }

    public static ContentResult ShareDocument(this ControllerBase controller, ShareDocument document)
    {
        var headers = controller.Response.Headers;
        headers.CacheControl = "public, max-age=60";
        headers.ContentSecurityPolicy = "frame-ancestors 'none'";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        return new ContentResult
        {
            StatusCode = document.StatusCode,
            ContentType = "text/html; charset=utf-8",
            Content = document.Html
        };
    }
}
