using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.RemoveParticipant;

public interface IRemoveParticipantHandler
{
    Task<RemoveParticipantResponse> HandleAsync(string idOrSlug, string participantId, CancellationToken ct = default);
}
