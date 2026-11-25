using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public interface IGlobalSearchHandler
{
    Task<GlobalSearchResponse> HandleAsync(
        string? query,
        string? currentUserId,
        CatalogLanguage language,
        CancellationToken ct = default);
}
