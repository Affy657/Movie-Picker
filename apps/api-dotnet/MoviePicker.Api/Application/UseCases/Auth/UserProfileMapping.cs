using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Auth;

public static class UserProfileMapping
{
    public static UserProfileResponse ToResponse(User user) => new()
    {
        UserId = user.Id,
        DisplayName = user.DisplayName,
        EmailMasked = EmailMasking.Mask(user.Email),
        Email = user.Email,
        EmailVerifiedAt = user.EmailVerifiedAt,
        UiTheme = user.UiTheme,
        AccentColor = user.AccentColor,
        RatingScale = user.RatingScale,
        DimWatched = user.DimWatched,
        AvatarId = user.DisplayedAvatarId,
        AvatarPhotoId = user.AvatarPhoto?.AvatarId,
        GeneratedAvatarId = user.AvatarId,
        Handle = user.Handle,
        Bio = user.Bio,
        IsProfilePublic = user.IsProfilePublic,
        IsWatchlistPublic = user.IsWatchlistPublic,
        IsWatchedPublic = user.IsWatchedPublic,
        LetterboxdUsername = user.LetterboxdUsername,
        LetterboxdLastSyncAt = user.LetterboxdLastSyncAt,
        LetterboxdLastSyncError = user.LetterboxdLastSyncError,
        LetterboxdPendingReconciliationCount = user.LetterboxdPendingReconciliationCount,
        LetterboxdSyncWatchlist = user.LetterboxdSyncWatchlist,
        LetterboxdSyncWatched = user.LetterboxdSyncWatched,
        LetterboxdWatchlistCount = user.LetterboxdWatchlistCount,
        LetterboxdWatchedCount = user.LetterboxdWatchedCount,
        HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
        LinkedProviders = user.Identities.Select(i => i.Provider).ToList(),
        Favorites = FavoriteTitleResponse.ListFrom(user.Favorites),
        Banner = ProfileBannerResponse.From(user),
        BannerPhotoUrl = ProfileBannerResponse.PhotoUrlOf(user),
        CreatedAt = user.CreatedAt
    };
}
