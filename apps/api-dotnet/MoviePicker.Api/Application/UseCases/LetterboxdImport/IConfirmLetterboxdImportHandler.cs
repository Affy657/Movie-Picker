using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public interface IConfirmLetterboxdImportHandler
{
    Task<LetterboxdImportConfirmResponse> HandleAsync(
        string userId,
        LetterboxdImportConfirmRequest request,
        CancellationToken ct = default);
}
