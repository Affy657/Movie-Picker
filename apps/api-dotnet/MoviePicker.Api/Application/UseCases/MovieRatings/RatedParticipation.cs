using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

internal static class RatedParticipation
{
    public static async Task<Participant> ResolveOwnAsync(
        IParticipantRepository participantRepository,
        ICurrentUserAccessor currentUserAccessor,
        Event evt,
        string participantId,
        CancellationToken ct)
    {
        var participant = await participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct)
            ?? throw Errors.InvalidParticipant();

        var currentUserId = currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId)
            throw Errors.RatingOwnParticipationOnly();

        return participant;
    }
}
