namespace MoviePicker.Api.Domain.Entities;

public enum LetterboxdImportTarget
{
    Watchlist,
    Watched
}

public sealed record LetterboxdListSync(DateTimeOffset At, string? Error);
