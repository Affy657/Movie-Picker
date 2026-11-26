namespace MoviePicker.Api.Application.UseCases.RemoveParticipant;

public interface ILetBackInHandler
{
    Task HandleAsync(string slug, string userId, CancellationToken ct = default);
}
