namespace MoviePicker.Api.Application.UseCases.RemoveParticipant;

public interface ILetBackInHandler
{
    Task HandleAsync(string idOrSlug, string userId, CancellationToken ct = default);
}
