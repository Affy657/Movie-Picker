using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public interface IPreviewLetterboxdImportHandler
{
    Task<LetterboxdImportPreviewResponse> HandleAsync(
        string userId,
        LetterboxdImportPreviewRequest request,
        CancellationToken ct = default);

    Task<LetterboxdImportPreviewResponse> HandleFromAccountAsync(
        string userId,
        CancellationToken ct = default);
}
