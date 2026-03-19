using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class MoviePickerExceptionFilter : IExceptionFilter
{
    private readonly IHostEnvironment _env;

    public MoviePickerExceptionFilter(IHostEnvironment env)
    {
        _env = env;
    }

    public void OnException(ExceptionContext context)
    {
        var http = context.HttpContext;

        if (context.Exception is MoviePickerException ex)
        {
            context.Result = new JsonResult(ApiErrorResponse.FromHttpContext(http, ex.StatusCode, ex.Message))
            {
                StatusCode = ex.StatusCode
            };
            context.ExceptionHandled = true;
            return;
        }

        if (context.Exception is ArgumentException or InvalidOperationException)
        {
            context.Result = new JsonResult(
                ApiErrorResponse.FromHttpContext(http, (int)HttpStatusCode.BadRequest, context.Exception.Message))
            {
                StatusCode = (int)HttpStatusCode.BadRequest
            };
            context.ExceptionHandled = true;
            return;
        }

        var message = _env.IsDevelopment() ? context.Exception.Message : "Une erreur interne s'est produite.";
        context.Result = new JsonResult(
            ApiErrorResponse.FromHttpContext(http, (int)HttpStatusCode.InternalServerError, message))
        {
            StatusCode = (int)HttpStatusCode.InternalServerError
        };
        context.ExceptionHandled = true;
    }
}
