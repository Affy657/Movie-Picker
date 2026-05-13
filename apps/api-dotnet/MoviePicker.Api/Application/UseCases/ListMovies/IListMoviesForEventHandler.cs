using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public interface IListMoviesForEventHandler
{
    /// <summary>
    /// Liste les films d'une soirée. Si <paramref name="participantId"/> est fourni, chaque
    /// film expose <see cref="MovieWithScoreResponse.MyVote"/> = vote du participant (1 / -1)
    /// ou <see langword="null"/> s'il n'a pas voté ; sinon ce champ reste <see langword="null"/>.
    /// </summary>
    Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string idOrSlug,
        string? participantId = null,
        CancellationToken ct = default);
}
