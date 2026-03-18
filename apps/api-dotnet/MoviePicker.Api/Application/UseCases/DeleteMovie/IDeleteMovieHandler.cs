namespace MoviePicker.Api.Application.UseCases.DeleteMovie;

public interface IDeleteMovieHandler
{
    Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default);
}
