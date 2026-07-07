namespace MoviePicker.Api.Configuration;

public sealed class DevelopmentSeedOptions
{
    public const string SectionName = "DevelopmentSeed";

    public bool Enabled { get; set; }

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public bool SeedSampleEvents { get; set; } = true;

    public List<DevelopmentSeedExtraUserEntry> ExtraUsers { get; set; } = [];

    public bool SeedScenarioDemos { get; set; } = true;
}

public sealed class DevelopmentSeedExtraUserEntry
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
}
