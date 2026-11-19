using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/usage-counts")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class UsageCountsController : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.UsageCountPolicy)]
    [SharedRateLimit(RateLimitingExtensions.UsageCountPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Report(
        [FromBody] ReportUsageCountRequest request,
        [FromServices] IReportUsageCountHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(request, ct);
        return NoContent();
    }
}
