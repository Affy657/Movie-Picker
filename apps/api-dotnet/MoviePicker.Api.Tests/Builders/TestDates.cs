using System.Globalization;

namespace MoviePicker.Api.Tests.Builders;

internal static class TestDates
{
    public static readonly DateOnly UpcomingDay = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(1);

    public static readonly string Upcoming = Iso(UpcomingDay);

    public static string UpcomingPlusDays(int days) => Iso(UpcomingDay.AddDays(days));

    public static string Iso(DateOnly day) => day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
