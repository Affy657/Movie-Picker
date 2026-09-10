namespace MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;

public interface IAnnounceWheelWinnerHandler
{
    Task HandleAsync(string idOrSlug, CancellationToken ct = default);
}
