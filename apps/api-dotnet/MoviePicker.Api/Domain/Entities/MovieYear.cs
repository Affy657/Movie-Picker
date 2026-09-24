namespace MoviePicker.Api.Domain.Entities;

public static class MovieYear
{
    public static string? Normalize(string? year) => string.IsNullOrWhiteSpace(year) ? null : year.Trim();
}
