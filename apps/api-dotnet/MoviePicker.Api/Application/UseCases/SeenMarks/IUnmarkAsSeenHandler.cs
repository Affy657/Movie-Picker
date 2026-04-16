namespace MoviePicker.Api.Application.UseCases.SeenMarks;

public interface IUnmarkAsSeenHandler
{
    Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default);
}
