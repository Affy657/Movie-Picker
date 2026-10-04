using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Avatars;

public interface IOAuthProfilePhotoImporter
{
    Task<User> ImportAsync(User user, ExternalLoginInfo info, string? accessToken, CancellationToken ct = default);
}

public sealed class OAuthProfilePhotoImporter : IOAuthProfilePhotoImporter
{
    private const string GoogleProvider = "google";

    private readonly IGoogleProfilePhotoSource _google;
    private readonly AvatarPhotoWriter _writer;
    private readonly ILogger<OAuthProfilePhotoImporter> _logger;

    public OAuthProfilePhotoImporter(
        IGoogleProfilePhotoSource google,
        AvatarPhotoWriter writer,
        ILogger<OAuthProfilePhotoImporter> logger)
    {
        _google = google;
        _writer = writer;
        _logger = logger;
    }

    public async Task<User> ImportAsync(User user, ExternalLoginInfo info, string? accessToken, CancellationToken ct = default)
    {
        if (!string.Equals(info.Provider, GoogleProvider, StringComparison.Ordinal) || string.IsNullOrEmpty(accessToken))
            return user;

        try
        {
            return await ImportGooglePhotoAsync(user, accessToken, ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "OAuth profile photo: the Google photo could not be imported for {UserId}", user.Id);
            return user;
        }
    }

    private async Task<User> ImportGooglePhotoAsync(User user, string accessToken, CancellationToken ct)
    {
        var bytes = await _google.FetchAsync(accessToken, ct);
        if (bytes is null)
            return user;
        if (AvatarPhotoImage.AcceptedFormatOf(bytes) is not { } format)
        {
            _logger.LogWarning("OAuth profile photo: the Google image was refused for {UserId}", user.Id);
            return user;
        }
        return await _writer.ReplaceAsync(user.Id, bytes, format, ct);
    }
}
