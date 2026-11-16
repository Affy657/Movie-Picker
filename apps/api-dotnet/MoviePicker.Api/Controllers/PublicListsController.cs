using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.PublicLists;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/users/{handle}/lists")]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class PublicListsController : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(PublicListsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(
        string handle,
        [FromServices] IListPublicListsHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(handle, currentUser.GetUserId(), ct));

    [HttpGet("{listId}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(PublicListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        string handle,
        string listId,
        [FromServices] IGetPublicListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(handle, listId, currentUser.GetUserId(), ct));

    [HttpPost("{listId}/copy")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Copy(
        string handle,
        string listId,
        [FromBody] CopySavedListRequest request,
        [FromServices] ICopyPublicListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Created(string.Empty, await handler.HandleAsync(userId, handle, listId, request, ct));
    }
}
