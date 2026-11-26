using System.Globalization;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class EventStartPolicy
{
    public static void EnsureSchedulable(Event scheduled, DateTimeOffset utcNow)
    {
        if (!DateOnly.TryParseExact(scheduled.Date, EventSchedule.DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
            throw Errors.InvalidDateFormat();

        if (!EventSchedule.IsWellFormedTime(scheduled.Time))
            throw Errors.InvalidTimeFormat();

        if (day > EventRecurrence.TodayInParis(utcNow).AddYears(EventSchedule.MaxYearsAhead))
            throw Errors.EventDateTooFar(EventSchedule.MaxYearsAhead);

        if (!EventSchedule.TryGetStartUtc(scheduled.Date, scheduled.Time, out _))
            throw Errors.InvalidDateFormat();

        if (scheduled.IsFinished(utcNow))
            throw Errors.EventDateTooEarly();
    }

    public static string CleanTitle(string? raw)
    {
        var title = UserText.Clean(raw);
        if (!UserText.HasVisibleCharacter(title))
            throw Errors.EventTitleRequired();
        return title;
    }
}
