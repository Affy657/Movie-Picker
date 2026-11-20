using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventConfigResponse
{
    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public int? MaxVotesPerParticipant { get; init; }

    public WheelMode WheelMode { get; init; }

    public bool RichSharePreview { get; init; }
    public bool AllowSeries { get; init; }

    public int WinnerCount { get; init; }

    public RecurrenceFrequency? Recurrence { get; init; }
    public bool HasNextOccurrence { get; init; }
    public string? GroupId { get; init; }

    public static EventConfigResponse FromEvent(Event evt)
    {
        var c = evt.Config;
        return new EventConfigResponse
        {
            Theme = c?.Theme,
            ThemeColor = c?.ThemeColor,
            MaxProposalsPerParticipant = c?.MaxProposalsPerParticipant,
            MaxParticipants = c?.MaxParticipants,
            MaxVotesPerParticipant = c?.MaxVotesPerParticipant,
            WheelMode = c?.WheelMode ?? EventConfig.SavedWithoutSettings.WheelMode,
            RichSharePreview = c?.RichSharePreview ?? EventConfig.SavedWithoutSettings.RichSharePreview,
            AllowSeries = c?.AllowSeries ?? false,
            WinnerCount = evt.TargetWinnerCount,
            Recurrence = evt.Recurrence,
            HasNextOccurrence = !string.IsNullOrEmpty(evt.NextOccurrenceEventId),
            GroupId = string.IsNullOrEmpty(evt.GroupId) ? null : evt.GroupId
        };
    }
}

public sealed class PatchEventConfigRequest
{
    public string? Title { get; init; }
    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public bool? ClearThemeColor { get; init; }

    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public int? MaxVotesPerParticipant { get; init; }

    public WheelMode? WheelMode { get; init; }

    public bool? RichSharePreview { get; init; }
    public bool? AllowSeries { get; init; }

    public int? WinnerCount { get; init; }

    public RecurrenceFrequency? Recurrence { get; init; }
    public bool? ClearRecurrence { get; init; }

    [MaxLength(64)]
    public string? GroupId { get; init; }
    public bool? ClearGroup { get; init; }

    public string? Date { get; init; }
    public string? Time { get; init; }

    public bool? NotifyParticipantsOfDateChange { get; init; }
}
