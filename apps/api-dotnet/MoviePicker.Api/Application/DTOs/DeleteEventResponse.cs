namespace MoviePicker.Api.Application.DTOs;

/// <summary>
/// Réponse à la suppression d'une soirée. Donne un retour quantitatif sur la
/// cascade pour que le client puisse afficher un message de confirmation
/// précis (« 12 participants et 27 films retirés »).
/// </summary>
public sealed class DeleteEventResponse
{
    public string EventId { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;

    /// <summary>Nombre de participants retirés en cascade.</summary>
    public long RemovedParticipants { get; init; }

    /// <summary>Nombre de films retirés en cascade.</summary>
    public long RemovedMovies { get; init; }

    /// <summary>Nombre de votes retirés en cascade.</summary>
    public long RemovedVotes { get; init; }

    /// <summary>Nombre de marques « déjà vu » retirées en cascade.</summary>
    public long RemovedSeenMarks { get; init; }
}
