namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public interface IClearMovieVoteHandler
{
    /// <summary>
    /// Supprime le vote d'un participant pour un film. Idempotent : si aucun vote n'existait,
    /// l'opération réussit silencieusement (cf. <see cref="ClearMovieVoteHandler"/>) — l'intention
    /// « plus de vote sur ce film » est déjà satisfaite, on évite un 404 sur double-clic / retry.
    /// </summary>
    Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default);
}
