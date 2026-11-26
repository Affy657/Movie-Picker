using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;

public interface IDeleteMoviePitchNoteHandler
{
    Task HandleAsync(string userId, string slug, string movieId, DeleteMoviePitchNoteRequest request, CancellationToken ct = default);
}
