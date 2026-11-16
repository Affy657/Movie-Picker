namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdSyncBudget(TimeSpan FirstList, TimeSpan Total)
{
    public static readonly TimeSpan CallerMargin = TimeSpan.FromSeconds(30);

    public static LetterboxdSyncBudget Within(TimeSpan requestBudget)
    {
        var total = requestBudget - CallerMargin;
        return new LetterboxdSyncBudget(total / 2, total);
    }
}
