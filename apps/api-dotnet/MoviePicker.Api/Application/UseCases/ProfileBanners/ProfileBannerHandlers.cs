using MoviePicker.Api.Application.Banners;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.ProfileBanners;

public interface ISetProfileBannerHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, SetProfileBannerRequest request, CancellationToken ct = default);
}

public interface IRemoveProfileBannerHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default);
}

public interface IUploadBannerPhotoHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, UploadBannerPhotoRequest request, CancellationToken ct = default);
}

public interface IDeleteBannerPhotoHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default);
}

public interface IGetMovieBackdropsHandler
{
    Task<MovieBackdropsResponse?> HandleAsync(int tmdbId, CancellationToken ct = default);
}

public sealed class GetMovieBackdropsHandler : IGetMovieBackdropsHandler
{
    private const string ThumbnailBase = "https://image.tmdb.org/t/p/w780";

    private readonly ITmdbMovieSearch _tmdb;

    public GetMovieBackdropsHandler(ITmdbMovieSearch tmdb) => _tmdb = tmdb;

    public async Task<MovieBackdropsResponse?> HandleAsync(int tmdbId, CancellationToken ct = default)
    {
        var backdrops = await TmdbCalls.OrUnavailableAsync(() => _tmdb.GetBackdropsAsync(tmdbId, ct));
        return backdrops is null
            ? null
            : new MovieBackdropsResponse
            {
                TmdbId = tmdbId,
                Backdrops = backdrops
                    .Select(b => new MovieBackdropResponse { Path = b.Path, ThumbnailUrl = ThumbnailBase + b.Path, Width = b.Width, Height = b.Height })
                    .ToList()
            };
    }
}

internal static class TmdbCalls
{
    public static async Task<T> OrUnavailableAsync<T>(Func<Task<T>> call)
    {
        try
        {
            return await call();
        }
        catch (HttpRequestException)
        {
            throw Errors.MovieDetailsUnavailable();
        }
    }
}

public sealed class SetProfileBannerHandler : ISetProfileBannerHandler
{
    private readonly ProfileBannerWriter _writer;
    private readonly ITmdbMovieSearch _tmdb;

    public SetProfileBannerHandler(ProfileBannerWriter writer, ITmdbMovieSearch tmdb)
    {
        _writer = writer;
        _tmdb = tmdb;
    }

    public async Task<UserProfileResponse> HandleAsync(string userId, SetProfileBannerRequest request, CancellationToken ct = default)
    {
        if (request.Source == SetProfileBannerRequest.PhotoSource)
            return UserProfileMapping.ToResponse(await _writer.UsePhotoAsync(userId, ct));

        if (request.TmdbId is not { } tmdbId || string.IsNullOrEmpty(request.ImagePath))
            throw Errors.ProfileBannerInvalid();

        var backdrops = await TmdbCalls.OrUnavailableAsync(() => _tmdb.GetBackdropsAsync(tmdbId, ct)) ?? throw Errors.MovieNotFound();
        if (!backdrops.Any(b => string.Equals(b.Path, request.ImagePath, StringComparison.Ordinal)))
            throw Errors.ProfileBannerInvalid();

        var details = await TmdbCalls.OrUnavailableAsync(() => _tmdb.GetDetailsAsync(tmdbId, MovieMediaType.Movie, CatalogLanguage.French, ct))
            ?? throw Errors.MovieNotFound();
        return UserProfileMapping.ToResponse(await _writer.UseFilmAsync(userId, tmdbId, details.Title, request.ImagePath, ct));
    }
}

public sealed class RemoveProfileBannerHandler : IRemoveProfileBannerHandler
{
    private readonly ProfileBannerWriter _writer;

    public RemoveProfileBannerHandler(ProfileBannerWriter writer) => _writer = writer;

    public async Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default) =>
        UserProfileMapping.ToResponse(await _writer.RemoveAsync(userId, ct));
}

public sealed class UploadBannerPhotoHandler : IUploadBannerPhotoHandler
{
    private readonly ProfileBannerWriter _writer;

    public UploadBannerPhotoHandler(ProfileBannerWriter writer) => _writer = writer;

    public async Task<UserProfileResponse> HandleAsync(string userId, UploadBannerPhotoRequest request, CancellationToken ct = default)
    {
        var bytes = Decode(request.Base64Content);
        var format = BannerPhotoImage.AcceptedFormatOf(bytes) ?? throw Errors.BannerPhotoInvalid();
        if (!string.Equals(format.ContentType, request.ContentType, StringComparison.OrdinalIgnoreCase))
            throw Errors.BannerPhotoInvalid();

        return UserProfileMapping.ToResponse(await _writer.ReplacePhotoAsync(userId, bytes, format, ct));
    }

    private static byte[] Decode(string base64Content)
    {
        try
        {
            return Convert.FromBase64String(base64Content);
        }
        catch (FormatException)
        {
            throw Errors.BannerPhotoInvalid();
        }
    }
}

public sealed class DeleteBannerPhotoHandler : IDeleteBannerPhotoHandler
{
    private readonly ProfileBannerWriter _writer;

    public DeleteBannerPhotoHandler(ProfileBannerWriter writer) => _writer = writer;

    public async Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default) =>
        UserProfileMapping.ToResponse(await _writer.DeletePhotoAsync(userId, ct));
}
