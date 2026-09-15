using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class EventConfigLimits
{
    public static int? ResolveLimit(int value, int? cap, string field)
    {
        if (value < 0)
            throw Errors.ConfigLimitInvalid(field);

        if (cap.HasValue && value > cap.Value)
            throw Errors.ConfigLimitOutOfRange(field, cap.Value);

        return value == 0 ? null : value;
    }

    public static int ResolveWinnerCount(int value)
    {
        if (value < EventConfig.DefaultWinnerCount || value > EventConfig.WinnerCountCap)
            throw Errors.WinnerCountOutOfRange(EventConfig.DefaultWinnerCount, EventConfig.WinnerCountCap);

        return value;
    }

    public static string? NormalizeTheme(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
}
