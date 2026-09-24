namespace MoviePicker.Api.Domain;

public static class EventSchedule
{
    public static readonly TimeSpan PendingDelay = TimeSpan.FromHours(2);
    public static readonly TimeSpan AutoCloseDelay = TimeSpan.FromDays(7);

    private static readonly DateTime LatestStartWithAWholeLifecycle = DateTime.MaxValue - PendingDelay - AutoCloseDelay;

    public static readonly TimeZoneInfo ParisTimeZone = ResolveParisTimeZone();

    public static bool TryGetStartUtc(string date, string time, out DateTimeOffset startUtc)
    {
        if (!DateTime.TryParse(
                $"{date}T{time}:00",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.NoCurrentDateDefault,
                out var local))
        {
            startUtc = default;
            return false;
        }

        var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        if (ParisTimeZone.IsInvalidTime(unspecified))
        {
            startUtc = default;
            return false;
        }

        if (!TryConvertParisToUtc(unspecified, out var utc) || utc > LatestStartWithAWholeLifecycle)
        {
            startUtc = default;
            return false;
        }

        startUtc = new DateTimeOffset(utc, TimeSpan.Zero);
        return true;
    }

    private static bool TryConvertParisToUtc(DateTime parisTime, out DateTime utc)
    {
        try
        {
            utc = TimeZoneInfo.ConvertTimeToUtc(parisTime, ParisTimeZone);
            return true;
        }
        catch (ArgumentException)
        {
            utc = default;
            return false;
        }
    }

    private static TimeZoneInfo ResolveParisTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Paris");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
