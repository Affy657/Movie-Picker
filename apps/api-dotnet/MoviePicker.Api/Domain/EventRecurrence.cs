namespace MoviePicker.Api.Domain;

public enum RecurrenceFrequency
{
    Weekly,
    Biweekly,
    Monthly
}

public static class EventRecurrence
{
    public const int MaxCatchUpSteps = 60;

    public static DateOnly? NextDate(DateOnly current, RecurrenceFrequency frequency, DateOnly notBefore)
    {
        for (var step = 1; step <= MaxCatchUpSteps; step++)
        {
            var candidate = Shift(current, frequency, step);
            if (candidate > notBefore)
                return candidate;
        }

        return null;
    }

    public static DateOnly TodayInParis(DateTimeOffset utcNow) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(utcNow, EventSchedule.ParisTimeZone).DateTime);

    private static DateOnly Shift(DateOnly from, RecurrenceFrequency frequency, int step) => frequency switch
    {
        RecurrenceFrequency.Weekly => from.AddDays(7 * step),
        RecurrenceFrequency.Biweekly => from.AddDays(14 * step),
        _ => from.AddMonths(step)
    };
}
