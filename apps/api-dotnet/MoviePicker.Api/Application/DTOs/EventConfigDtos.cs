using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventConfigResponse
{
    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public WheelMode WheelMode { get; init; }

    public bool RichSharePreview { get; init; }
    public bool AllowSeries { get; init; }

    public static EventConfigResponse FromEvent(Event evt)
    {
        var c = evt.Config;
        return new EventConfigResponse
        {
            Theme = c?.Theme,
            ThemeColor = c?.ThemeColor,
            EndDate = c?.EndDate,
            MaxProposalsPerParticipant = c?.MaxProposalsPerParticipant,
            MaxParticipants = c?.MaxParticipants,
            WheelMode = c?.WheelMode ?? WheelMode.StrictRandom,
            RichSharePreview = c?.RichSharePreview ?? true,
            AllowSeries = c?.AllowSeries ?? false
        };
    }
}

public sealed class PatchEventConfigRequest
{
    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public bool? ClearThemeColor { get; init; }

    public string? EndDate { get; init; }

    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public WheelMode? WheelMode { get; init; }

    public bool? RichSharePreview { get; init; }
    public bool? AllowSeries { get; init; }

    public string? Date { get; init; }
    public string? Time { get; init; }
}
