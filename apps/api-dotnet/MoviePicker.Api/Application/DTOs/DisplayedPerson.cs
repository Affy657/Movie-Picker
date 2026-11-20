using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed record DisplayedPerson(
    string UserId,
    string Handle,
    string? PublicHandle,
    string DisplayName,
    string AvatarId,
    AccentColor AccentColor = AccentColor.Default)
{
    public static DisplayedPerson From(User user) =>
        new(
            user.Id,
            user.Handle,
            PublicOrNull(user.IsProfilePublic, user.Handle),
            user.DisplayName,
            user.DisplayedAvatarId,
            user.AccentColor);

    public static DisplayedPerson From(UserCard card) =>
        new(
            card.Id,
            card.Handle ?? string.Empty,
            PublicOrNull(card.IsProfilePublic, card.Handle),
            card.DisplayName,
            card.DisplayedAvatarId,
            card.AccentColor);

    public static DisplayedPerson Unknown(string userId) =>
        new(userId, string.Empty, null, string.Empty, string.Empty);

    public static DisplayedPerson? LinkedTo(Participant participant, IReadOnlyDictionary<string, UserCard> cardsByUserId) =>
        participant.UserId is { } userId && cardsByUserId.TryGetValue(userId, out var card) ? From(card) : null;

    private static string? PublicOrNull(bool isProfilePublic, string? handle) =>
        isProfilePublic && !string.IsNullOrEmpty(handle) ? handle : null;
}
