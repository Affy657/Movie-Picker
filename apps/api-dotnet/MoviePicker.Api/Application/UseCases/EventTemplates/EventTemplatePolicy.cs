using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public static class EventTemplatePolicy
{
    public static async Task<User> RequireUserAsync(
        IUserRepository users,
        string userId,
        CancellationToken ct) =>
        await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable");

    public static int RequireIndexOf(IReadOnlyList<EventTemplate> templates, string templateId)
    {
        for (var index = 0; index < templates.Count; index++)
        {
            if (templates[index].Id == templateId)
                return index;
        }

        throw new NotFoundException("Template de soirée introuvable");
    }

    public static string NormalizeName(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            throw new BadRequestException("Le nom du template ne peut pas être vide.");
        if (trimmed.Length > EventTemplate.MaxNameLength)
            throw new BadRequestException(
                $"Le nom du template ne peut pas dépasser {EventTemplate.MaxNameLength} caractères.");
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
            throw new ConflictException($"Un template s'appelle déjà « {name} ».");
    }

    public static EventConfig ToConfig(SaveEventTemplateRequest request) => new()
    {
        Theme = string.IsNullOrWhiteSpace(request.Theme) ? null : request.Theme.Trim(),
        MaxProposalsPerParticipant = ResolveLimit(
            request.MaxProposalsPerParticipant,
            EventConfig.MaxProposalsPerParticipantCap,
            "maxProposalsPerParticipant"),
        MaxParticipants = ResolveLimit(
            request.MaxParticipants,
            EventConfig.MaxParticipantsCap,
            "maxParticipants"),
        WheelMode = request.WheelMode ?? WheelMode.WeightedByVotes,
        RichSharePreview = request.RichSharePreview ?? true,
        AllowSeries = request.AllowSeries ?? false
    };

    private static int? ResolveLimit(int? value, int cap, string field)
    {
        if (!value.HasValue)
            return null;

        if (value.Value < 0 || value.Value > cap)
            throw new BadRequestException($"{field} doit être entre 0 (pas de limite) et {cap}.");

        return value.Value == 0 ? null : value.Value;
    }
}
