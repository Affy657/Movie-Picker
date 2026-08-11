using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public interface ISyncLetterboxdWatchlistHandler
{
    Task<LetterboxdSyncResponse> HandleAsync(string userId, bool force, CancellationToken ct = default);
}
