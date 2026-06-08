using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Application.UseCases.SetMoviePitchNote;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/events/{idOrSlug}/movies")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class EventMoviesController : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<MovieWithScoreResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(
        string idOrSlug,
        [FromServices] IListMoviesForEventHandler handler,
        CancellationToken ct,
        [FromQuery] string? participantId = null)
    {
        var list = await handler.HandleAsync(idOrSlug, participantId, ct);
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
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var movie = await handler.HandleAsync(idOrSlug, request, currentUser.GetUserId(), ct);
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
        [FromBody] DeleteMovieRequest body,
        [FromServices] IDeleteMovieHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, movieId, body.ParticipantId, ct);
        return NoContent();
    }

    [HttpPost("{movieId}/vote")]
    [EnableRateLimiting(RateLimitingExtensions.VoteMutationPolicy)]
    [ProducesResponseType(typeof(VoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
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

    [HttpDelete("{movieId}/vote")]
    [EnableRateLimiting(RateLimitingExtensions.VoteMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ClearVote(
        string idOrSlug,
        string movieId,
        [FromQuery] string participantId,
        [FromServices] IClearMovieVoteHandler handler,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(participantId))
            return BadRequest(new { error = "Le paramètre participantId est requis." });
        await handler.HandleAsync(idOrSlug, movieId, participantId, ct);
        return NoContent();
    }

    [HttpPost("{movieId}/seen")]
    [EnableRateLimiting(RateLimitingExtensions.SeenMarksMutationPolicy)]
    [ProducesResponseType(typeof(SeenMarkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> MarkAsSeen(
        string idOrSlug,
        string movieId,
        [FromBody] MarkAsSeenRequest request,
        [FromServices] IMarkAsSeenHandler handler,
        CancellationToken ct)
    {
        var res = await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return Ok(res);
    }

    [HttpPut("{movieId}/note")]
    [EnableRateLimiting(RateLimitingExtensions.NoteMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SetPitchNote(
        string idOrSlug,
        string movieId,
        [FromBody] SetMoviePitchNoteRequest request,
        [FromServices] ISetMoviePitchNoteHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return NoContent();
    }

    [HttpDelete("{movieId}/note")]
    [EnableRateLimiting(RateLimitingExtensions.NoteMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> DeletePitchNote(
        string idOrSlug,
        string movieId,
        [FromBody] DeleteMoviePitchNoteRequest request,
        [FromServices] IDeleteMoviePitchNoteHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return NoContent();
    }

    [HttpDelete("{movieId}/seen")]
    [EnableRateLimiting(RateLimitingExtensions.SeenMarksMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> UnmarkAsSeen(
        string idOrSlug,
        string movieId,
        [FromBody] UnmarkAsSeenRequest request,
        [FromServices] IUnmarkAsSeenHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, movieId, request.ParticipantId, ct);
        return NoContent();
    }
}
