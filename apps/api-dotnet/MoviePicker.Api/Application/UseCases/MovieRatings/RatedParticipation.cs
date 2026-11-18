using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

internal static class RatedParticipation
{
    public static async Task<Participant> ResolveOwnAsync(
        IParticipantRepository participantRepository,
        string userId,
        Event evt,
        string participantId,
        CancellationToken ct)
    {
        var participant = await participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct)
            ?? throw Errors.InvalidParticipant();

        if (participant.UserId != userId)
            throw Errors.RatingOwnParticipationOnly();

        return participant;
    }
}
