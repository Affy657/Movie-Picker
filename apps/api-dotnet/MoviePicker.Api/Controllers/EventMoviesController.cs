using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.VoteMovie;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route("events/{idOrSlug}/movies")]
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
}
