namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public interface IClearMovieVoteHandler
{
    Task HandleAsync(string userId, string idOrSlug, string movieId, string participantId, CancellationToken ct = default);
}
