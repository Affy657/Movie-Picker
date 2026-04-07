namespace MoviePicker.Api.Application.UseCases.Reactions;

public interface IRemoveReactionHandler
{
    Task HandleAsync(string idOrSlug, string movieId, string reactionId, string participantId, CancellationToken ct = default);
}
