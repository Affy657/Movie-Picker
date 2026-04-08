namespace MoviePicker.Api.Application.UseCases.EventSharePreview;

/// <summary>
/// HTML minimal avec balises Open Graph / Twitter pour crawlers (aperçu de lien). L’URL canonique pointe vers le front SPA.
/// </summary>
public interface IGetEventSharePreviewHtmlHandler
{
    /// <param name="apiPublicBaseUrl">Origine publique de l’API (<c>https://…</c>, sans slash final) pour construire l’URL absolue d’une affiche.</param>
    Task<string> BuildHtmlAsync(string idOrSlug, string apiPublicBaseUrl, CancellationToken ct = default);
}
