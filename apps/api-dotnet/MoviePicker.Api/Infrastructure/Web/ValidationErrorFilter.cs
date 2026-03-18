using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

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
            message = "Validation échouée";

        context.Result = new BadRequestObjectResult(new { error = message });
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
