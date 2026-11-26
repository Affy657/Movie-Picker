using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public interface IVoteMovieHandler
{
    Task<VoteResponse> HandleAsync(string userId, string slug, string movieId, VoteRequest request, CancellationToken ct = default);
}
