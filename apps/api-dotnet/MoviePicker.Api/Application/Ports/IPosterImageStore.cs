namespace MoviePicker.Api.Application.Ports;

/// <summary>
/// Cache d’affiches TMDB : chemins publics pour le JSON et livraison binaire (GET).
/// La clé API TMDB n’est jamais exposée au navigateur ; seules les images publiques image.tmdb.org sont récupérées.
/// </summary>
public interface IPosterImageStore
{
    /// <summary>
    /// Sans E/S : si l’URL est une affiche TMDB normalisable, renvoie <c>/api/v1/posters/{cléSha256}</c> ;
    /// chemin API déjà valide → normalisé ; sinon entrée inchangée.
    /// </summary>
    string? ToPublicPosterPath(string? posterUrl);

    /// <summary>Enregistre la source TMDB (métadonnées) pour permettre le lazy fetch sur GET.</summary>
    Task RegisterTmdbSourceAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default);

    /// <summary>Enregistre plusieurs sources distinctes en une fois (ex. liste films d’une soirée).</summary>
    Task RegisterTmdbSourcesAsync(IReadOnlyCollection<string> normalizedTmdbHttpsUrls, CancellationToken ct = default);

    /// <summary>Récupère le binaire pour une clé (lazy fetch TMDB si absent ou expiré).</summary>
    Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default);
}

/// <param name="Data">Octets image.</param>
/// <param name="ContentType">Type MIME (image/jpeg, image/png, image/webp).</param>
public sealed record PosterImageBlob(byte[] Data, string ContentType);
