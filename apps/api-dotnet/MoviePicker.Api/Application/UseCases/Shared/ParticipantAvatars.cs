using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public sealed class ParticipantAvatars
{
    private readonly IReadOnlyDictionary<string, UserCard> _cardByUserId;

    private ParticipantAvatars(IReadOnlyDictionary<string, UserCard> cardByUserId) => _cardByUserId = cardByUserId;

    public static async Task<ParticipantAvatars> LoadAsync(
        IUserRepository users,
        IEnumerable<Participant> participants,
        CancellationToken ct)
    {
        var userIds = participants
            .Select(p => p.UserId)
            .OfType<string>()
            .Where(id => id.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (userIds.Count == 0)
            return new ParticipantAvatars(new Dictionary<string, UserCard>(StringComparer.Ordinal));

        var cards = (await users.ListCardsByIdsAsync(userIds, ct))
            .DistinctBy(card => card.Id)
            .ToDictionary(card => card.Id, StringComparer.Ordinal);
        return new ParticipantAvatars(cards);
    }

    public string? Of(Participant participant) =>
        DisplayedPerson.LinkedTo(participant, _cardByUserId)?.AvatarId is { Length: > 0 } avatarId ? avatarId : null;
}
