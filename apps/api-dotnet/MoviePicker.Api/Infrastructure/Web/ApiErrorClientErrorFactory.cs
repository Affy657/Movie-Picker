using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class ApiErrorClientErrorFactory : IClientErrorFactory
{
    public IActionResult GetClientError(ActionContext actionContext, IClientErrorActionResult clientError)
    {
        var status = clientError.StatusCode ?? StatusCodes.Status400BadRequest;
        var (message, reason) = GenericApiErrors.Describe(status);
        return new JsonResult(ApiErrorResponse.FromHttpContext(actionContext.HttpContext, status, message, reason))
        {
            StatusCode = status
        };
    }
}
