using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SetManualWinner;

public interface ISetManualWinnerHandler
{
    Task<WheelResponse> HandleAsync(string idOrSlug, SetManualWinnerRequest request, CancellationToken ct = default);
}
