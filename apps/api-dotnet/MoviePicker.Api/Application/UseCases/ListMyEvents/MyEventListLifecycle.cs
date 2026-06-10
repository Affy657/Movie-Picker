using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public static class MyEventListLifecycle
{
    public const string Upcoming = "upcoming";
    public const string Live = "live";
    public const string Finished = "finished";

    public static string Compute(Event e, DateTimeOffset utcNow)
    {
        var effectivelyFinished = e.IsFinished(utcNow)
            || !string.IsNullOrEmpty(e.WinnerMovieId);

        if (effectivelyFinished)
            return Finished;

        if (!TryParseScheduledInstant(e, out var instant))
            return Finished;

        if (utcNow < instant)
            return Upcoming;

        return Live;
    }

    private static bool TryParseScheduledInstant(Event e, out DateTimeOffset instant) =>
        DateTimeOffset.TryParse(
            $"{e.Date}T{e.Time}:00Z",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.AssumeUniversal,
            out instant);
}
