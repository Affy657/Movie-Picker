using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

internal static class MovieActionContext
{
    public static async Task<(Event Event, Movie Movie, Participant Participant)> ResolveOwnedMovieAsync(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ICurrentUserAccessor currentUserAccessor,
        DateTimeOffset utcNow,
        string idOrSlug,
        string movieId,
        string participantId,
        Func<ForbiddenException> ownershipError,
        CancellationToken ct,
        Func<ConflictException>? wheelLockedError = null)
    {
        var evt = await eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(utcNow))
            throw Errors.EventFinished();

        if (wheelLockedError is not null && evt.HasWinner)
            throw wheelLockedError();

        var movie = await movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw Errors.MovieNotFound();

        var participant = await participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw Errors.InvalidParticipant();

        var currentUserId = currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId)
            throw ownershipError();

        return (evt, movie, participant);
    }

    public static async Task<(Event Event, Movie Movie, string? CurrentUserId, bool IsHost)> ResolveMovieForHostActionAsync(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        DateTimeOffset utcNow,
        string idOrSlug,
        string movieId,
        Func<ConflictException> wheelLockedError,
        CancellationToken ct)
    {
        var evt = await eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(utcNow))
            throw Errors.EventFinished();

        if (evt.HasWinner)
            throw wheelLockedError();

        var movie = await movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw Errors.MovieNotFound();

        var currentUserId = currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, hostTokenAccessor.GetHostToken(), currentUserId);

        return (evt, movie, currentUserId, isHost);
    }
}
