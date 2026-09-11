using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class EventConfigLimits
{
    public static int? ResolveLimit(int value, int? cap, string field)
    {
        if (value < 0)
            throw new BadRequestException($"{field} doit être 0 (pas de limite) ou un entier positif.");

        if (cap.HasValue && value > cap.Value)
            throw new BadRequestException($"{field} doit être entre 0 (pas de limite) et {cap.Value}.");

        return value == 0 ? null : value;
    }

    public static int ResolveWinnerCount(int value)
    {
        if (value < EventConfig.DefaultWinnerCount || value > EventConfig.WinnerCountCap)
            throw new BadRequestException(
                $"Le nombre de films gagnants doit être compris entre {EventConfig.DefaultWinnerCount} et {EventConfig.WinnerCountCap}.");

        return value;
    }

    public static string? NormalizeTheme(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
}
