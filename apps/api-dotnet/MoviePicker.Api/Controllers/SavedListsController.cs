using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Infrastructure.Web.OpenApi;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/saved-lists")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class SavedListsController : ControllerBase
{
    [HttpGet]
    [EnableRateLimiting(RateLimitingExtensions.SavedListReadPolicy)]
    [ProducesResponseType(typeof(SavedListsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> List(
        [FromQuery, ValuesOf(typeof(ListSourceNames))] string? sourceType,
        [FromQuery] string? sourceId,
        [FromServices] IListSavedListsHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, sourceType, sourceId, ct));
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.SavedListMutationPolicy)]
    [ProducesResponseType(typeof(SavedListSummaryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(SavedListSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Save(
        [FromBody] SaveListRequest request,
        [FromServices] ISaveListHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        var saving = await handler.HandleAsync(userId, request, ct);
        return saving.Created ? Created(string.Empty, saving.Summary) : Ok(saving.Summary);
    }

    [HttpGet("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.SavedListReadPolicy)]
    [ProducesResponseType(typeof(SavedListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        string id,
        [FromServices] IGetSavedListHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpDelete("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.SavedListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        string id,
        [FromServices] IUnsaveListHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpPost("{id}/copy")]
    [EnableRateLimiting(RateLimitingExtensions.SavedListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Copy(
        string id,
        [FromBody] CopySavedListRequest request,
        [FromServices] ICopySavedListHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Created(string.Empty, await handler.HandleAsync(userId, id, request, ct));
    }
}
