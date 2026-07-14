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
        string idOrSlug,
        string movieId,
        string participantId,
        string ownershipError,
        CancellationToken ct,
        string? wheelLockedError = null)
    {
        var evt = await eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        if (wheelLockedError is not null && !string.IsNullOrEmpty(evt.WinnerMovieId))
            throw new ConflictException(wheelLockedError);

        var movie = await movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var participant = await participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        var currentUserId = currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId)
            throw new ForbiddenException(ownershipError);

        return (evt, movie, participant);
    }

    public static async Task<(Event Event, Movie Movie, string? CurrentUserId, bool IsHost)> ResolveMovieForHostActionAsync(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        string idOrSlug,
        string movieId,
        string wheelLockedError,
        CancellationToken ct)
    {
        var evt = await eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
            throw new ConflictException(wheelLockedError);

        var movie = await movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var currentUserId = currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, hostTokenAccessor.GetHostToken(), currentUserId);

        return (evt, movie, currentUserId, isHost);
    }
}
