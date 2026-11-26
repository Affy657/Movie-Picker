using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.RemoveWinner;

public interface IRemoveWinnerHandler
{
    Task<ResetWheelResponse> HandleAsync(string slug, string movieId, CancellationToken ct = default);
}
