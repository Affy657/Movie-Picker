using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class PatchUserProfileHandler : IPatchUserProfileHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public PatchUserProfileHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task<UserProfileResponse> HandleAsync(
        string userId,
        PatchUserProfileRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable");

        var nothingToUpdate = request.DisplayName is null
            && request.UiTheme is null
            && request.AccentColor is null
            && request.RatingScale is null
            && request.AvatarId is null
            && request.Handle is null
            && request.Bio is null
            && request.IsProfilePublic is null
            && request.IsWatchlistPublic is null
            && request.LetterboxdUsername is null;

        if (nothingToUpdate)
            return ToResponse(user);

        var updated = await ApplyRequestAsync(user, request, ct);

        User saved;
        try
        {
            saved = await _users.UpdateAsync(updated, ct);
        }
        catch (ConflictException ex) when (ex.Message == "handle_conflict")
        {
            throw new ConflictException("Ce handle est déjà pris.");
        }
        return ToResponse(saved);
    }

    private async Task<User> ApplyRequestAsync(User user, PatchUserProfileRequest request, CancellationToken ct)
    {
        var displayName = user.DisplayName;
        if (request.DisplayName is not null)
        {
            var err = AuthInputValidation.ValidateDisplayName(request.DisplayName);
            if (err is not null)
                throw new BadRequestException(err);
            displayName = request.DisplayName.Trim();
        }

        var theme = user.UiTheme;
        if (request.UiTheme is not null)
            theme = ParseEnum(request.UiTheme, UiThemePreference.System);

        var accent = user.AccentColor;
        if (request.AccentColor is not null)
            accent = ParseEnum(request.AccentColor, AccentColor.Default);

        var ratingScale = user.RatingScale;
        if (request.RatingScale is not null)
            ratingScale = ParseEnum(request.RatingScale, RatingScale.Five);

        var avatarId = request.AvatarId ?? user.AvatarId;

        var handle = user.Handle;
        if (request.Handle is not null)
            handle = await ResolveHandleAsync(request.Handle, user, ct);

        var bio = ApplyBio(user.Bio, request.Bio);
        var isProfilePublic = request.IsProfilePublic ?? user.IsProfilePublic;
        var isWatchlistPublic = request.IsWatchlistPublic ?? user.IsWatchlistPublic;
        var letterboxdUsername = ApplyLetterboxdUsername(user.LetterboxdUsername, request.LetterboxdUsername);

        var letterboxdChanged = !string.Equals(
            letterboxdUsername,
            user.LetterboxdUsername,
            StringComparison.OrdinalIgnoreCase);

        return user with
        {
            DisplayName = displayName,
            UiTheme = theme,
            AccentColor = accent,
            RatingScale = ratingScale,
            AvatarId = avatarId,
            Handle = handle,
            Bio = bio,
            IsProfilePublic = isProfilePublic,
            IsWatchlistPublic = isWatchlistPublic,
            LetterboxdUsername = letterboxdUsername,
            LetterboxdLastSyncAt = letterboxdChanged ? null : user.LetterboxdLastSyncAt,
            LetterboxdLastSyncError = letterboxdChanged ? null : user.LetterboxdLastSyncError,
            UpdatedAt = _clock.GetUtcNow()
        };
    }

    private async Task<string> ResolveHandleAsync(string requested, User user, CancellationToken ct)
    {
        var normalized = HandlePolicy.Normalize(requested);
        if (string.Equals(normalized, user.Handle, StringComparison.Ordinal))
            return user.Handle;

        var err = HandlePolicy.Validate(normalized);
        if (err is not null)
            throw new BadRequestException(err);

        var existing = await _users.GetByHandleAsync(normalized, ct);
        if (existing is not null && existing.Id != user.Id)
            throw new ConflictException("Ce handle est déjà pris.");

        return normalized;
    }

    private static UserProfileResponse ToResponse(User user) => new()
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
        HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
        LinkedProviders = user.Identities.Select(i => i.Provider).ToList(),
        CreatedAt = user.CreatedAt
    };

    private static T ParseEnum<T>(string raw, T defaultValue) where T : struct, Enum =>
        Enum.TryParse<T>(raw, ignoreCase: true, out var result) ? result : defaultValue;

    private static string? ApplyBio(string? current, string? requested)
    {
        if (requested is null)
            return current;
        var bioErr = HandlePolicy.ValidateBio(requested);
        if (bioErr is not null)
            throw new BadRequestException(bioErr);
        var trimmed = requested.Trim();
        return trimmed.Length == 0 ? null : trimmed;
    }

    private static string? ApplyLetterboxdUsername(string? current, string? requested)
    {
        if (requested is null)
            return current;
        var trimmed = requested.Trim();
        if (trimmed.Length > 0 && !IsValidLetterboxdUsername(trimmed))
            throw new BadRequestException("Le pseudo Letterboxd ne peut contenir que des lettres, chiffres et underscores.");
        return trimmed.Length == 0 ? null : trimmed;
    }

    private static bool IsValidLetterboxdUsername(string username) =>
        username.Length <= 40 && username.All(c => char.IsAsciiLetterOrDigit(c) || c == '_');
}
