namespace MoviePicker.Api.Application.UseCases.SeenMarks;

public interface IUnmarkAsSeenHandler
{
    Task HandleAsync(string userId, string slug, string movieId, string participantId, CancellationToken ct = default);
}
