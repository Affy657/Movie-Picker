namespace MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;

public interface IAnnounceWheelWinnerHandler
{
    Task HandleAsync(string slug, CancellationToken ct = default);
}
