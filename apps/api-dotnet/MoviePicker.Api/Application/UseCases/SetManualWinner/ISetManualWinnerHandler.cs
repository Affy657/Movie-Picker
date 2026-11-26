using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SetManualWinner;

public interface ISetManualWinnerHandler
{
    Task<WheelResponse> HandleAsync(string slug, SetManualWinnerRequest request, CancellationToken ct = default);
}
