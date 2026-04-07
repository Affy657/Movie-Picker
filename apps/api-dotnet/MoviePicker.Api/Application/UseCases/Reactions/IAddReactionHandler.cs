using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Reactions;

public interface IAddReactionHandler
{
    Task<ReactionResponse> HandleAsync(string idOrSlug, string movieId, AddReactionRequest request, CancellationToken ct = default);
}
