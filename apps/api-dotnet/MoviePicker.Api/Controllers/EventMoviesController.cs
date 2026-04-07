using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.Reactions;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/events/{idOrSlug}/movies")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class EventMoviesController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MovieWithScoreResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(
        string idOrSlug,
        [FromServices] IListMoviesForEventHandler handler,
        CancellationToken ct)
    {
        var list = await handler.HandleAsync(idOrSlug, ct);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MovieWithScoreResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Add(
        string idOrSlug,
        [FromBody] AddMovieRequest request,
        [FromServices] IAddMovieHandler handler,
        CancellationToken ct)
    {
        var movie = await handler.HandleAsync(idOrSlug, request, ct);
        return Created(string.Empty, movie);
    }

    [HttpDelete("{movieId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        string idOrSlug,
        string movieId,
        [FromBody] DeleteMovieRequest? body,
        [FromServices] IDeleteMovieHandler handler,
        CancellationToken ct)
    {
        if (body is null || string.IsNullOrEmpty(body.ParticipantId))
            return BadRequest(new { error = "participantId requis" });

        await handler.HandleAsync(idOrSlug, movieId, body.ParticipantId, ct);
        return NoContent();
    }

    [HttpPost("{movieId}/vote")]
    [ProducesResponseType(typeof(VoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Vote(
        string idOrSlug,
        string movieId,
        [FromBody] VoteRequest request,
        [FromServices] IVoteMovieHandler handler,
        CancellationToken ct)
    {
        var vote = await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return Ok(vote);
    }

    [HttpGet("{movieId}/reactions")]
    [ProducesResponseType(typeof(MovieReactionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReactions(
        string idOrSlug,
        string movieId,
        [FromServices] IGetMovieReactionsHandler handler,
        CancellationToken ct)
    {
        var res = await handler.HandleAsync(idOrSlug, movieId, ct);
        return Ok(res);
    }

    [HttpPost("{movieId}/reactions")]
    [EnableRateLimiting(RateLimitingExtensions.ReactionsMutationPolicy)]
    [ProducesResponseType(typeof(ReactionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> AddReaction(
        string idOrSlug,
        string movieId,
        [FromBody] AddReactionRequest request,
        [FromServices] IAddReactionHandler handler,
        CancellationToken ct)
    {
        var res = await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return Ok(res);
    }

    [HttpDelete("{movieId}/reactions/{reactionId}")]
    [EnableRateLimiting(RateLimitingExtensions.ReactionsMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RemoveReaction(
        string idOrSlug,
        string movieId,
        string reactionId,
        [FromBody] RemoveReactionRequest? request,
        [FromServices] IRemoveReactionHandler handler,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrEmpty(request.ParticipantId))
            return BadRequest(new { error = "participantId requis" });

        await handler.HandleAsync(idOrSlug, movieId, reactionId, request.ParticipantId, ct);
        return NoContent();
    }
}
