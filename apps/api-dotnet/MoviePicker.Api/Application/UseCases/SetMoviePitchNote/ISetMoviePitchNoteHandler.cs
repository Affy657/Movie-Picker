using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SetMoviePitchNote;

public interface ISetMoviePitchNoteHandler
{
    Task HandleAsync(string idOrSlug, string movieId, SetMoviePitchNoteRequest request, CancellationToken ct = default);
}
