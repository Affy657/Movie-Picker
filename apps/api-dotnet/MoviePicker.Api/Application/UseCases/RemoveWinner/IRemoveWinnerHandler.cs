using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.RemoveWinner;

public interface IRemoveWinnerHandler
{
    Task<ResetWheelResponse> HandleAsync(string idOrSlug, string movieId, CancellationToken ct = default);
}
