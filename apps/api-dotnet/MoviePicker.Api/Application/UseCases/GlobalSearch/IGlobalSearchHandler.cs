using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public interface IGlobalSearchHandler
{
    Task<GlobalSearchResponse> HandleAsync(string? query, string? currentUserId, CancellationToken ct = default);
}
