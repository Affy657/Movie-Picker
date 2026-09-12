using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventTemplateResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Theme { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public int? MaxVotesPerParticipant { get; init; }

    public WheelMode WheelMode { get; init; }

    public bool RichSharePreview { get; init; }

    public bool AllowSeries { get; init; }

    public int WinnerCount { get; init; }

    public static EventTemplateResponse FromTemplate(EventTemplate template)
    {
        var config = template.Config;
        return new EventTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Theme = config.Theme,
            MaxProposalsPerParticipant = config.MaxProposalsPerParticipant,
            MaxParticipants = config.MaxParticipants,
            MaxVotesPerParticipant = config.MaxVotesPerParticipant,
            WheelMode = config.WheelMode,
            RichSharePreview = config.RichSharePreview,
            AllowSeries = config.AllowSeries,
            WinnerCount = config.WinnerCount
        };
    }
}

public sealed class EventTemplateListResponse
{
    public IReadOnlyList<EventTemplateResponse> Items { get; init; } = Array.Empty<EventTemplateResponse>();
}

public sealed class SaveEventTemplateRequest
{
    public string? Name { get; init; }
    public string? Theme { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public int? MaxVotesPerParticipant { get; init; }

    public WheelMode? WheelMode { get; init; }

    public bool? RichSharePreview { get; init; }

    public bool? AllowSeries { get; init; }

    public int? WinnerCount { get; init; }
}
