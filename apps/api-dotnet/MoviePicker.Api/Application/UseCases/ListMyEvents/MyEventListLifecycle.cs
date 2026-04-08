using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

/// <summary>État d’affichage pour la liste « mes soirées » : à venir, en cours, terminée.</summary>
public static class MyEventListLifecycle
{
    public const string Upcoming = "upcoming";
    public const string Live = "live";
    public const string Finished = "finished";

    /// <summary>
    /// <paramref name="utcNow"/> : horloge serveur (alignée sur <see cref="Event.IsFinished"/>).
    /// Terminée : clôture, roue tirée, ou règles <see cref="Event.IsFinished"/>.
    /// Sinon : avant l’instant date+heure affiché → à venir ; après → en cours.
    /// </summary>
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
            null,
            System.Globalization.DateTimeStyles.AssumeUniversal,
            out instant);
}
