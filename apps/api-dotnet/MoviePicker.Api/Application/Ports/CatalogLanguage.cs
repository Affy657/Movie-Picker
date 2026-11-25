namespace MoviePicker.Api.Application.Ports;

public enum CatalogLanguage
{
    French,
    English
}

public static class CatalogLanguages
{
    public static string TmdbCode(this CatalogLanguage language) =>
        language == CatalogLanguage.English ? "en-US" : "fr-FR";

    public static string IsoCode(this CatalogLanguage language) =>
        language == CatalogLanguage.English ? "en" : "fr";

    public static CatalogLanguage? FromTag(string? tag)
    {
        var primary = (tag ?? string.Empty).Trim().Split('-', 2)[0];
        if (primary.Equals("fr", StringComparison.OrdinalIgnoreCase))
            return CatalogLanguage.French;
        if (primary.Equals("en", StringComparison.OrdinalIgnoreCase))
            return CatalogLanguage.English;
        return null;
    }

    public static CatalogLanguage FirstSupported(IEnumerable<string> tagsByPreference)
    {
        foreach (var tag in tagsByPreference)
        {
            if (FromTag(tag) is { } language)
                return language;
        }
        return CatalogLanguage.French;
    }
}
