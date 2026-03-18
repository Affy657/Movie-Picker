using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public interface IVoteMovieHandler
{
    Task<VoteResponse> HandleAsync(string idOrSlug, string movieId, VoteRequest request, CancellationToken ct = default);
}
