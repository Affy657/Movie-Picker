using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Auth;

public static class UserProfileResponses
{
    public static UserProfileResponse From(User user) => new()
    {
        UserId = user.Id,
        DisplayName = user.DisplayName,
        EmailMasked = EmailMasking.Mask(user.Email),
        Email = user.Email,
        UiTheme = user.UiTheme,
        AccentColor = user.AccentColor,
        RatingScale = user.RatingScale,
        AvatarId = user.AvatarId,
        Handle = user.Handle,
        Bio = user.Bio,
        IsProfilePublic = user.IsProfilePublic,
        IsWatchlistPublic = user.IsWatchlistPublic,
        LetterboxdUsername = user.LetterboxdUsername,
        LetterboxdLastSyncAt = user.LetterboxdLastSyncAt,
        LetterboxdLastSyncError = user.LetterboxdLastSyncError,
        LetterboxdPendingReconciliationCount = user.LetterboxdPendingReconciliationCount,
        HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
        LinkedProviders = user.Identities.Select(i => i.Provider).ToList(),
        Favorites = FavoriteTitleResponse.ListFrom(user.Favorites),
        CreatedAt = user.CreatedAt
    };
}
