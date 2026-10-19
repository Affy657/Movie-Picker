using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.NightRecap;

public interface IGetNightRecapHandler
{
    Task<NightRecapResponse> HandleAsync(string recapSlug, CancellationToken ct = default);
}
