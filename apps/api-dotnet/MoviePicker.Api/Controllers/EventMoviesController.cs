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
[Route(ApiRoutePrefix.V1 + "/events/{slug}/movies")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class EventMoviesController : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.EventViewPollPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<MovieWithScoreResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> List(
        string slug,
        [RequestLanguage] CatalogLanguage interfaceLanguage,
        [FromServices] IEventViewTagHandler viewTag,
        [FromServices] IListMoviesForEventHandler handler,
        CancellationToken ct,
        [FromQuery] string? participantId = null)
    {
        var entityTag = await viewTag.HandleAsync(slug, interfaceLanguage, ct);
        ConditionalGet.Stamp(Response, entityTag);
        if (ConditionalGet.IsNotModified(Request, entityTag))
            return StatusCode(StatusCodes.Status304NotModified);

        var list = await handler.HandleAsync(slug, interfaceLanguage, participantId, ct);
        return Ok(list);
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.MovieMutationPolicy)]
    [ProducesResponseType(typeof(MovieWithScoreResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Add(
        string slug,
        [FromBody] AddMovieRequest request,
        [FromServices] IAddMovieHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        var movie = await handler.HandleAsync(userId, slug, request, ct);
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
        string slug,
        string movieId,
        [FromBody] DeleteMovieRequest body,
        [FromServices] IDeleteMovieHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, slug, movieId, body.ParticipantId, ct);
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
        string slug,
        string movieId,
        [FromBody] VoteRequest request,
        [FromServices] IVoteMovieHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        var vote = await handler.HandleAsync(userId, slug, movieId, request, ct);
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
        string slug,
        string movieId,
        [FromQuery] string participantId,
        [FromServices] IClearMovieVoteHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(participantId))
            throw Errors.ParticipantIdRequired();
        await handler.HandleAsync(userId, slug, movieId, participantId, ct);
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
        string slug,
        string movieId,
        [FromBody] MarkAsSeenRequest request,
        [FromServices] IMarkAsSeenHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        var res = await handler.HandleAsync(userId, slug, movieId, request, ct);
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
        string slug,
        string movieId,
        [FromBody] SetMoviePitchNoteRequest request,
        [FromServices] ISetMoviePitchNoteHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, slug, movieId, request, ct);
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
        string slug,
        string movieId,
        [FromBody] DeleteMoviePitchNoteRequest request,
        [FromServices] IDeleteMoviePitchNoteHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, slug, movieId, request, ct);
        return NoContent();
    }

    [HttpPut("{movieId}/wheel-exclusion")]
    [EnableRateLimiting(RateLimitingExtensions.MovieMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SetWheelExclusion(
        string slug,
        string movieId,
        [FromBody] SetMovieWheelExclusionRequest request,
        [FromServices] ISetMovieWheelExclusionHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, slug, movieId, request, ct);
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
        string slug,
        string movieId,
        [FromBody] SetMovieRatingRequest request,
        [FromServices] ISetMovieRatingHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        var res = await handler.HandleAsync(userId, slug, movieId, request, ct);
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
        string slug,
        string movieId,
        [FromBody] DeleteMovieRatingRequest request,
        [FromServices] IDeleteMovieRatingHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, slug, movieId, request.ParticipantId, ct);
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
        string slug,
        string movieId,
        [FromBody] UnmarkAsSeenRequest request,
        [FromServices] IUnmarkAsSeenHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, slug, movieId, request.ParticipantId, ct);
        return NoContent();
    }
}
