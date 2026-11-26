namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public interface IDeleteMovieRatingHandler
{
    Task HandleAsync(string userId, string slug, string movieId, string participantId, CancellationToken ct = default);
}
