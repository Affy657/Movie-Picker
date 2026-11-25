using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.NightRecap;

public interface IGetNightRecapHandler
{
    Task<NightRecapResponse> HandleAsync(string recapSlug, CatalogLanguage language, CancellationToken ct = default);
}
