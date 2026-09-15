using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class ValidationErrorFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ModelState.IsValid)
            return;

        var errors = context.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .Where(s => !string.IsNullOrEmpty(s));
        var message = string.Join("; ", errors);
        if (string.IsNullOrEmpty(message))
            message = "Validation failed";

        context.Result = new BadRequestObjectResult(
            ApiErrorResponse.FromHttpContext(
                context.HttpContext,
                StatusCodes.Status400BadRequest,
                message,
                ErrorCodes.ValidationFailed));
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
