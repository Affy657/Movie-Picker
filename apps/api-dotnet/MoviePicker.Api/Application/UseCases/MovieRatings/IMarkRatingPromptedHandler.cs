namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public interface IMarkRatingPromptedHandler
{
    Task HandleAsync(string userId, string slug, CancellationToken ct = default);
}
