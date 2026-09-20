namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public interface IDeleteMovieRatingHandler
{
    Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default);
}
