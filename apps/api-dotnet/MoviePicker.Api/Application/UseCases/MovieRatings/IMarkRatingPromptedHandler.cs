namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public interface IMarkRatingPromptedHandler
{
    Task HandleAsync(string userId, string idOrSlug, CancellationToken ct = default);
}
