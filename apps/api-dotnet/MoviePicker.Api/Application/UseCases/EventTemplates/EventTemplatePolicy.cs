using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public static class EventTemplatePolicy
{

    public static async Task<User> RequireUserAsync(
        IUserRepository users,
        string userId,
        CancellationToken ct) =>
        await users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();

    public static EventTemplate RequireTemplate(IReadOnlyList<EventTemplate> templates, string templateId) =>
        templates.FirstOrDefault(template => template.Id == templateId)
        ?? throw Errors.EventTemplateNotFound();

    public static string NormalizeName(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            throw Errors.EventTemplateNameRequired();
        if (trimmed.Length > EventTemplate.MaxNameLength)
            throw Errors.EventTemplateNameTooLong(EventTemplate.MaxNameLength);
        return trimmed;
    }

    public static void EnsureNameIsFree(
        IReadOnlyList<EventTemplate> templates,
        string name,
        string? exceptTemplateId)
    {
        var alreadyTaken = templates.Any(template =>
            template.Id != exceptTemplateId
            && string.Equals(template.Name, name, StringComparison.OrdinalIgnoreCase));

        if (alreadyTaken)
            throw Errors.EventTemplateNameTaken(name);
    }

    public static EventConfig ToConfig(SaveEventTemplateRequest request) => new()
    {
        Theme = EventConfigLimits.NormalizeTheme(request.Theme),
        MaxProposalsPerParticipant = EventConfigLimits.ResolveLimit(
            request.MaxProposalsPerParticipant ?? 0,
            EventConfig.MaxProposalsPerParticipantCap,
            "maxProposalsPerParticipant"),
        MaxParticipants = EventConfigLimits.ResolveLimit(
            request.MaxParticipants ?? 0,
            EventConfig.MaxParticipantsCap,
            "maxParticipants"),
        MaxVotesPerParticipant = EventConfigLimits.ResolveLimit(
            request.MaxVotesPerParticipant ?? 0,
            null,
            "maxVotesPerParticipant"),
        WheelMode = request.WheelMode ?? WheelMode.WeightedByVotes,
        RichSharePreview = request.RichSharePreview ?? true,
        AllowSeries = request.AllowSeries ?? false,
        WinnerCount = EventConfigLimits.ResolveWinnerCount(request.WinnerCount ?? EventConfig.DefaultWinnerCount)
    };
}
