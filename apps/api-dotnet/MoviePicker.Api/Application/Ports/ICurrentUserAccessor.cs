namespace MoviePicker.Api.Application.Ports;

/// <summary>Utilisateur authentifié (cookie session) pour les cas d’usage qui en ont besoin.</summary>
public interface ICurrentUserAccessor
{
    /// <summary>Identifiant du compte (claim NameIdentifier), ou null si anonyme.</summary>
    string? GetUserId();
}
