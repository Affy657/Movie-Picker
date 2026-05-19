namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public interface IClearMovieVoteHandler
{
    Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default);
}
