using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;
using MoviePicker.Api.Application.UseCases.EventViewTag;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.MovieRatings;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Application.UseCases.SetMoviePitchNote;
using MoviePicker.Api.Application.UseCases.SetMovieWheelExclusion;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain.Exceptions;
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
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(
        string idOrSlug,
        [FromServices] IEventViewTagHandler viewTag,
        [FromServices] IListMoviesForEventHandler handler,
        CancellationToken ct,
        [FromQuery] string? participantId = null)
    {
        var entityTag = await viewTag.HandleAsync(idOrSlug, ct);
        ConditionalGet.Stamp(Response, entityTag);
        if (ConditionalGet.IsNotModified(Request, entityTag))
            return StatusCode(StatusCodes.Status304NotModified);

        var list = await handler.HandleAsync(idOrSlug, participantId, ct);
        return Ok(list);
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.MovieMutationPolicy)]
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
    [EnableRateLimiting(RateLimitingExtensions.MovieMutationPolicy)]
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
            throw Errors.ParticipantIdRequired();
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

    [HttpPut("{movieId}/wheel-exclusion")]
    [EnableRateLimiting(RateLimitingExtensions.MovieMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SetWheelExclusion(
        string idOrSlug,
        string movieId,
        [FromBody] SetMovieWheelExclusionRequest request,
        [FromServices] ISetMovieWheelExclusionHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return NoContent();
    }

    [HttpPut("{movieId}/rating")]
    [EnableRateLimiting(RateLimitingExtensions.RatingMutationPolicy)]
    [ProducesResponseType(typeof(MovieRatingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SetRating(
        string idOrSlug,
        string movieId,
        [FromBody] SetMovieRatingRequest request,
        [FromServices] ISetMovieRatingHandler handler,
        CancellationToken ct)
    {
        var res = await handler.HandleAsync(idOrSlug, movieId, request, ct);
        return Ok(res);
    }

    [HttpDelete("{movieId}/rating")]
    [EnableRateLimiting(RateLimitingExtensions.RatingMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> DeleteRating(
        string idOrSlug,
        string movieId,
        [FromBody] DeleteMovieRatingRequest request,
        [FromServices] IDeleteMovieRatingHandler handler,
        CancellationToken ct)
    {
        await handler.HandleAsync(idOrSlug, movieId, request.ParticipantId, ct);
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
