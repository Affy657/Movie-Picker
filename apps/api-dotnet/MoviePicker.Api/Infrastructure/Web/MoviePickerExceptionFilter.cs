using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;
using Sentry;

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
            var statusCode = ToHttpStatus(ex.Kind);
            if (statusCode >= StatusCodes.Status500InternalServerError)
            {
                SentrySdk.CaptureException(context.Exception);
            }

            context.Result = new JsonResult(ApiErrorResponse.FromHttpContext(http, statusCode, ex.Message))
            {
                StatusCode = statusCode
            };
            context.ExceptionHandled = true;
            return;
        }

        if (context.Exception is ArgumentException)
        {
            var argMessage = _env.IsDevelopment()
                ? context.Exception.Message
                : "Paramètre invalide.";
            context.Result = new JsonResult(
                ApiErrorResponse.FromHttpContext(http, (int)HttpStatusCode.BadRequest, argMessage))
            {
                StatusCode = (int)HttpStatusCode.BadRequest
            };
            context.ExceptionHandled = true;
            return;
        }

        SentrySdk.CaptureException(context.Exception);

        var message = _env.IsDevelopment() ? context.Exception.Message : "Une erreur interne s'est produite.";
        context.Result = new JsonResult(
            ApiErrorResponse.FromHttpContext(http, (int)HttpStatusCode.InternalServerError, message))
        {
            StatusCode = (int)HttpStatusCode.InternalServerError
        };
        context.ExceptionHandled = true;
    }

    private static int ToHttpStatus(ErrorKind kind) => kind switch
    {
        ErrorKind.InvalidInput => StatusCodes.Status400BadRequest,
        ErrorKind.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorKind.Forbidden => StatusCodes.Status403Forbidden,
        ErrorKind.NotFound => StatusCodes.Status404NotFound,
        ErrorKind.Conflict => StatusCodes.Status409Conflict,
        ErrorKind.ServiceUnavailable => StatusCodes.Status503ServiceUnavailable,
        _ => StatusCodes.Status500InternalServerError
    };
}
