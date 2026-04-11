namespace MoviePicker.Api.Configuration;

/// <summary>
/// Compte de test créé au démarrage en environnement Development uniquement (voir <c>DevelopmentDataSeedHostedService</c>).
/// Surcharges possibles via variables d’environnement : <c>DevelopmentSeed__Enabled</c>, <c>DevelopmentSeed__Email</c>, etc.
/// </summary>
public sealed class DevelopmentSeedOptions
{
    public const string SectionName = "DevelopmentSeed";

    public bool Enabled { get; set; }

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Si <see langword="true"/>, crée quelques soirées pour le compte de test (idempotent).</summary>
    public bool SeedSampleEvents { get; set; } = true;

    /// <summary>Utilisateurs de test additionnels (join / hôte alternatif). Si vide, valeurs par défaut Alice et Bob.</summary>
    public List<DevelopmentSeedExtraUserEntry> ExtraUsers { get; set; } = new();

    /// <summary>Scénarios démo (multi-participants, roue + clôture). Nécessite <see cref="ExtraUsers"/> (ou défauts).</summary>
    public bool SeedScenarioDemos { get; set; } = true;
}

public sealed class DevelopmentSeedExtraUserEntry
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
}
