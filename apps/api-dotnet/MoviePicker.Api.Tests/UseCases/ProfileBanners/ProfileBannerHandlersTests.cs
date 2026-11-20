using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Banners;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ProfileBanners;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.Logging;
using MoviePicker.Api.Tests.UseCases.EventTemplates;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ProfileBanners;

public sealed class ProfileBannerHandlersTests
{
    private const int DuneId = 693134;
    private const string SunsetPath = "/sunset.jpg";
    private const string DuelPath = "/duel.jpg";

    private static readonly DateTimeOffset Now = new(2026, 11, 20, 9, 0, 0, TimeSpan.Zero);

    private readonly InMemoryUserRepository _users = new();
    private readonly InMemoryBannerPhotoRepository _photos = new();
    private readonly MoviePickerOptions _options = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly CapturingLogger<ProfileBannerWriter> _writerLogs = new();
    private readonly SetProfileBannerHandler _set;
    private readonly RemoveProfileBannerHandler _remove;
    private readonly UploadBannerPhotoHandler _upload;
    private readonly DeleteBannerPhotoHandler _deletePhoto;

    public ProfileBannerHandlersTests()
    {
        var writer = new ProfileBannerWriter(
            _users,
            _photos,
            new InMemoryUnitOfWork(),
            new FrozenClock(Now),
            Options.Create(_options),
            _writerLogs);
        _set = new SetProfileBannerHandler(writer, _tmdb.Object);
        _remove = new RemoveProfileBannerHandler(writer);
        _upload = new UploadBannerPhotoHandler(writer);
        _deletePhoto = new DeleteBannerPhotoHandler(writer);

        _tmdb.Setup(t => t.GetBackdropsAsync(DuneId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new TmdbBackdrop(SunsetPath, 3840, 2160), new TmdbBackdrop(DuelPath, 1920, 1080)]);
        _tmdb.Setup(t => t.GetDetailsAsync(DuneId, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Details(DuneId, "Dune : Deuxième partie"));
    }

    private static TmdbMovieDetails Details(int id, string title) =>
        new(id, title, null, null, null, [], null, [], [], "2024-02-27");

    private async Task<User> UserAsync() =>
        await _users.AddAsync(new User
        {
            Email = $"{Guid.NewGuid():N}@test.local",
            DisplayName = "Léa",
            Handle = "lea" + Guid.NewGuid().ToString("N")[..8],
            AvatarId = "bolt",
            CreatedAt = Now,
            UpdatedAt = Now
        });

    private static SetProfileBannerRequest Film(int tmdbId = DuneId, string imagePath = SunsetPath) =>
        new() { Source = "film", TmdbId = tmdbId, ImagePath = imagePath };

    private static SetProfileBannerRequest Photo() => new() { Source = "photo" };

    private static UploadBannerPhotoRequest Upload(byte[] bytes, string contentType = "image/jpeg") =>
        new() { ContentType = contentType, Base64Content = Convert.ToBase64String(bytes) };

    private static byte[] Jpeg(int width = 1600, int height = 900) => ImageHeaders.Jpeg(width, height);

    private static string KeyOf(string url) => url[(url.LastIndexOf('/') + 1)..];

    [Fact]
    public async Task SetFilm_ImageOfTheFilm_BecomesTheBannerWithItsTitle()
    {
        var user = await UserAsync();

        var profile = await _set.HandleAsync(user.Id, Film());

        Assert.NotNull(profile.Banner);
        Assert.Equal("film", profile.Banner!.Source);
        Assert.Equal(DuneId, profile.Banner.TmdbId);
        Assert.Equal("Dune : Deuxième partie", profile.Banner.Title);
        Assert.Equal("https://image.tmdb.org/t/p/w1280" + SunsetPath, profile.Banner.ImageUrl);
        var saved = await _users.GetByIdAsync(user.Id);
        Assert.Equal(new ProfileBanner { Source = ProfileBannerSource.Film, TmdbId = DuneId, Title = "Dune : Deuxième partie", ImagePath = SunsetPath, UpdatedAt = Now }, saved!.Banner);
    }

    [Fact]
    public async Task SetFilm_ImageThatIsNotOneOfTheFilm_IsRefusedAndChangesNothing()
    {
        var user = await UserAsync();

        var error = await Assert.ThrowsAsync<BadRequestException>(() => _set.HandleAsync(user.Id, Film(imagePath: "/other.jpg")));

        Assert.Equal(ErrorCodes.ProfileBannerInvalid, error.Reason);
        Assert.Null((await _users.GetByIdAsync(user.Id))!.Banner);
    }

    [Theory]
    [InlineData(null, SunsetPath)]
    [InlineData(DuneId, null)]
    public async Task SetFilm_WithoutFilmOrImage_IsRefused(int? tmdbId, string? imagePath)
    {
        var user = await UserAsync();
        var request = new SetProfileBannerRequest { Source = "film", TmdbId = tmdbId, ImagePath = imagePath };

        var error = await Assert.ThrowsAsync<BadRequestException>(() => _set.HandleAsync(user.Id, request));

        Assert.Equal(ErrorCodes.ProfileBannerInvalid, error.Reason);
    }

    [Fact]
    public async Task SetFilm_UnknownFilm_IsNotFound()
    {
        var user = await UserAsync();
        _tmdb.Setup(t => t.GetBackdropsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<TmdbBackdrop>?)null);

        var error = await Assert.ThrowsAsync<NotFoundException>(() => _set.HandleAsync(user.Id, Film(42)));

        Assert.Equal(ErrorCodes.MovieNotFound, error.Reason);
    }

    [Fact]
    public async Task SetFilm_WhileTmdbIsDown_IsUnavailableAndChangesNothing()
    {
        var user = await UserAsync();
        _tmdb.Setup(t => t.GetBackdropsAsync(DuneId, It.IsAny<CancellationToken>())).ThrowsAsync(new HttpRequestException("down"));

        var error = await Assert.ThrowsAsync<ServiceUnavailableException>(() => _set.HandleAsync(user.Id, Film()));

        Assert.Equal(ErrorCodes.MovieDetailsUnavailable, error.Reason);
        Assert.Null((await _users.GetByIdAsync(user.Id))!.Banner);
    }

    [Fact]
    public async Task Backdrops_OfAFilm_AreListedWithTheirThumbnail()
    {
        var response = await new GetMovieBackdropsHandler(_tmdb.Object).HandleAsync(DuneId);

        Assert.NotNull(response);
        Assert.Equal(DuneId, response!.TmdbId);
        Assert.Equal([SunsetPath, DuelPath], response.Backdrops.Select(b => b.Path));
        Assert.Equal("https://image.tmdb.org/t/p/w780" + SunsetPath, response.Backdrops[0].ThumbnailUrl);
        Assert.Equal(3840, response.Backdrops[0].Width);
    }

    [Fact]
    public async Task Backdrops_OfAnUnknownFilm_AreNotFound()
    {
        _tmdb.Setup(t => t.GetBackdropsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<TmdbBackdrop>?)null);

        Assert.Null(await new GetMovieBackdropsHandler(_tmdb.Object).HandleAsync(42));
    }

    [Fact]
    public async Task Backdrops_WhileTmdbIsDown_AreUnavailable()
    {
        _tmdb.Setup(t => t.GetBackdropsAsync(DuneId, It.IsAny<CancellationToken>())).ThrowsAsync(new HttpRequestException("down"));

        var error = await Assert.ThrowsAsync<ServiceUnavailableException>(() => new GetMovieBackdropsHandler(_tmdb.Object).HandleAsync(DuneId));

        Assert.Equal(ErrorCodes.MovieDetailsUnavailable, error.Reason);
    }

    [Fact]
    public async Task SetFilm_AnotherImage_ReplacesTheBanner()
    {
        var user = await UserAsync();
        await _set.HandleAsync(user.Id, Film());

        var profile = await _set.HandleAsync(user.Id, Film(imagePath: DuelPath));

        Assert.Equal("https://image.tmdb.org/t/p/w1280" + DuelPath, profile.Banner!.ImageUrl);
    }

    [Fact]
    public async Task SetFilm_UnknownUser_IsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _set.HandleAsync("missing", Film()));
    }

    [Fact]
    public async Task Upload_ValidPhoto_IsStoredAndBecomesTheBanner()
    {
        var user = await UserAsync();

        var profile = await _upload.HandleAsync(user.Id, Upload(Jpeg()));

        Assert.Equal("photo", profile.Banner!.Source);
        Assert.Null(profile.Banner.TmdbId);
        Assert.Null(profile.Banner.Title);
        Assert.StartsWith("/api/v1/banners/", profile.Banner.ImageUrl);
        Assert.Equal(profile.Banner.ImageUrl, profile.BannerPhotoUrl);
        var stored = await _photos.GetByKeyAsync(KeyOf(profile.Banner.ImageUrl));
        Assert.NotNull(stored);
        Assert.Equal(user.Id, stored!.UserId);
        Assert.Equal("image/jpeg", stored.ContentType);
        Assert.Equal(Jpeg(), stored.Data);
    }

    [Fact]
    public async Task Upload_ReplacingThePhoto_DeletesThePreviousOne()
    {
        var user = await UserAsync();
        var first = await _upload.HandleAsync(user.Id, Upload(Jpeg()));

        var second = await _upload.HandleAsync(user.Id, Upload(ImageHeaders.WebpLossy(1920, 1080), "image/webp"));

        Assert.NotEqual(first.BannerPhotoUrl, second.BannerPhotoUrl);
        Assert.Null(await _photos.GetByKeyAsync(KeyOf(first.BannerPhotoUrl!)));
        Assert.NotNull(await _photos.GetByKeyAsync(KeyOf(second.BannerPhotoUrl!)));
    }

    [Theory]
    [InlineData(1600, 1200, "image/jpeg")]
    [InlineData(1000, 562, "image/jpeg")]
    [InlineData(1600, 900, "image/png")]
    public async Task Upload_UnacceptableImage_IsRefusedAndChangesNothing(int width, int height, string contentType)
    {
        var user = await UserAsync();

        var error = await Assert.ThrowsAsync<BadRequestException>(() => _upload.HandleAsync(user.Id, Upload(Jpeg(width, height), contentType)));

        Assert.Equal(ErrorCodes.BannerPhotoInvalid, error.Reason);
        Assert.Null((await _users.GetByIdAsync(user.Id))!.BannerPhoto);
        Assert.Equal(0, await _photos.EstimatedCountAsync());
    }

    [Fact]
    public async Task Upload_MalformedBase64_IsRefused()
    {
        var user = await UserAsync();

        var error = await Assert.ThrowsAsync<BadRequestException>(() =>
            _upload.HandleAsync(user.Id, new UploadBannerPhotoRequest { ContentType = "image/jpeg", Base64Content = "not base64!" }));

        Assert.Equal(ErrorCodes.BannerPhotoInvalid, error.Reason);
    }

    [Fact]
    public async Task Upload_FirstPhotoWhenTheStorageIsFull_IsRefusedAndWarns()
    {
        _options.BannerPhotoMaxEntries = 1;
        var other = await UserAsync();
        await _upload.HandleAsync(other.Id, Upload(Jpeg()));
        var user = await UserAsync();

        var error = await Assert.ThrowsAsync<ServiceUnavailableException>(() => _upload.HandleAsync(user.Id, Upload(Jpeg())));

        Assert.Equal(ErrorCodes.BannerPhotoStorageFull, error.Reason);
        Assert.Contains(_writerLogs.Entries, e => e.Level == LogLevel.Warning);
        Assert.Null((await _users.GetByIdAsync(user.Id))!.Banner);
    }

    [Fact]
    public async Task Upload_ReplacingAPhotoWhenTheStorageIsFull_StillWorks()
    {
        _options.BannerPhotoMaxEntries = 1;
        var user = await UserAsync();
        await _upload.HandleAsync(user.Id, Upload(Jpeg()));

        var profile = await _upload.HandleAsync(user.Id, Upload(Jpeg(1920, 1080)));

        Assert.Equal("photo", profile.Banner!.Source);
    }

    [Fact]
    public async Task SetFilm_AfterAnUpload_KeepsThePhotoToComeBackTo()
    {
        var user = await UserAsync();
        var uploaded = await _upload.HandleAsync(user.Id, Upload(Jpeg()));

        var profile = await _set.HandleAsync(user.Id, Film());

        Assert.Equal("film", profile.Banner!.Source);
        Assert.Equal(uploaded.BannerPhotoUrl, profile.BannerPhotoUrl);
        Assert.NotNull(await _photos.GetByKeyAsync(KeyOf(uploaded.BannerPhotoUrl!)));
    }

    [Fact]
    public async Task SetPhoto_WithAKeptPhoto_DisplaysItAgain()
    {
        var user = await UserAsync();
        var uploaded = await _upload.HandleAsync(user.Id, Upload(Jpeg()));
        await _set.HandleAsync(user.Id, Film());

        var profile = await _set.HandleAsync(user.Id, Photo());

        Assert.Equal("photo", profile.Banner!.Source);
        Assert.Equal(uploaded.BannerPhotoUrl, profile.Banner.ImageUrl);
    }

    [Fact]
    public async Task SetPhoto_WithoutPhoto_IsNotFound()
    {
        var user = await UserAsync();

        var error = await Assert.ThrowsAsync<NotFoundException>(() => _set.HandleAsync(user.Id, Photo()));

        Assert.Equal(ErrorCodes.BannerPhotoNotFound, error.Reason);
    }

    [Fact]
    public async Task Remove_TakesTheBannerOffButKeepsThePhoto()
    {
        var user = await UserAsync();
        var uploaded = await _upload.HandleAsync(user.Id, Upload(Jpeg()));

        var profile = await _remove.HandleAsync(user.Id);

        Assert.Null(profile.Banner);
        Assert.Equal(uploaded.BannerPhotoUrl, profile.BannerPhotoUrl);
        Assert.NotNull(await _photos.GetByKeyAsync(KeyOf(uploaded.BannerPhotoUrl!)));
    }

    [Fact]
    public async Task Remove_WithoutBanner_ChangesNothing()
    {
        var user = await UserAsync();

        var profile = await _remove.HandleAsync(user.Id);

        Assert.Null(profile.Banner);
    }

    [Fact]
    public async Task DeletePhoto_DisplayedAsBanner_TakesTheBannerOffToo()
    {
        var user = await UserAsync();
        var uploaded = await _upload.HandleAsync(user.Id, Upload(Jpeg()));

        var profile = await _deletePhoto.HandleAsync(user.Id);

        Assert.Null(profile.Banner);
        Assert.Null(profile.BannerPhotoUrl);
        Assert.Null(await _photos.GetByKeyAsync(KeyOf(uploaded.BannerPhotoUrl!)));
    }

    [Fact]
    public async Task DeletePhoto_WhileAFilmIsTheBanner_KeepsTheFilm()
    {
        var user = await UserAsync();
        await _upload.HandleAsync(user.Id, Upload(Jpeg()));
        await _set.HandleAsync(user.Id, Film());

        var profile = await _deletePhoto.HandleAsync(user.Id);

        Assert.Equal("film", profile.Banner!.Source);
        Assert.Null(profile.BannerPhotoUrl);
    }

    [Fact]
    public async Task DeletePhoto_WithoutPhoto_ChangesNothing()
    {
        var user = await UserAsync();
        await _set.HandleAsync(user.Id, Film());

        var profile = await _deletePhoto.HandleAsync(user.Id);

        Assert.Equal("film", profile.Banner!.Source);
    }
}
