using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class PostersControllerTests
{
    private static readonly string ValidKey = new('a', 64);

    private static readonly IOptions<MoviePickerOptions> CacheEnabled =
        Options.Create(new MoviePickerOptions { PosterCacheEnabled = true });

    private static readonly IOptions<MoviePickerOptions> CacheDisabled =
        Options.Create(new MoviePickerOptions { PosterCacheEnabled = false });

    [Fact]
    public async Task Get_InvalidKey_ReturnsNotFound_WithoutHittingStore()
    {
        var store = new Mock<IPosterImageStore>();
        var controller = new PostersController().WithContext();

        var result = await controller.Get("not-a-valid-key", store.Object, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        store.Verify(s => s.GetByKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_UnknownKey_ReturnsNotFound()
    {
        var store = new Mock<IPosterImageStore>();
        store.Setup(s => s.GetByKeyAsync(ValidKey, It.IsAny<CancellationToken>())).ReturnsAsync((PosterImageBlob?)null);
        var controller = new PostersController().WithContext();

        var result = await controller.Get(ValidKey, store.Object, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal("no-store", controller.Response.Headers.CacheControl);
        Assert.False(controller.Response.Headers.ContainsKey("ETag"));
    }

    [Fact]
    public async Task Get_KnownKey_ReturnsImageFile_WithCacheHeader()
    {
        var store = new Mock<IPosterImageStore>();
        var blob = new PosterImageBlob(new byte[] { 1, 2, 3 }, "image/jpeg");
        store.Setup(s => s.GetByKeyAsync(ValidKey, It.IsAny<CancellationToken>())).ReturnsAsync(blob);
        var controller = new PostersController().WithContext();

        var result = await controller.Get(ValidKey, store.Object, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("image/jpeg", file.ContentType);
        Assert.Equal(blob.Data, file.FileContents);
        Assert.Equal("public,max-age=86400,immutable", controller.Response.Headers.CacheControl);
        Assert.Equal($"\"{ValidKey}\"", controller.Response.Headers.ETag);
    }

    [Fact]
    public async Task Get_MatchingIfNoneMatch_Returns304_WithoutReadingStore()
    {
        var store = new Mock<IPosterImageStore>();
        var controller = new PostersController().WithContext();
        controller.Request.Headers.IfNoneMatch = $"\"{ValidKey}\"";

        var result = await controller.Get(ValidKey, store.Object, CancellationToken.None);

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status304NotModified, status.StatusCode);
        store.Verify(
            s => s.GetByKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData("w500", "../secrets.jpg")]
    [InlineData("big", "abc.jpg")]
    [InlineData("w500", "abc.svg")]
    public async Task GetTmdb_InvalidSegments_ReturnNotFound_WithoutHittingStore(string size, string file)
    {
        var store = new Mock<IPosterImageStore>();
        var controller = new PostersController().WithContext();

        var result = await controller.GetTmdb(size, file, store.Object, CacheEnabled, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        store.Verify(s => s.GetOrFetchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetTmdb_ValidSegments_FetchTheTmdbSourceThroughTheStore()
    {
        const string source = "https://image.tmdb.org/t/p/w500/abc.jpg";
        var store = new Mock<IPosterImageStore>();
        var blob = new PosterImageBlob(new byte[] { 4, 2 }, "image/jpeg");
        store.Setup(s => s.GetOrFetchAsync(source, It.IsAny<CancellationToken>())).ReturnsAsync(blob);
        var controller = new PostersController().WithContext();

        var result = await controller.GetTmdb("w500", "abc.jpg", store.Object, CacheEnabled, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal(blob.Data, file.FileContents);
        Assert.Equal("public,max-age=86400,immutable", controller.Response.Headers.CacheControl);
        Assert.Equal(
            $"\"{MoviePicker.Api.Application.Posters.TmdbPosterUrlNormalizer.ComputeKey(source)}\"",
            controller.Response.Headers.ETag);
    }

    [Fact]
    public async Task GetTmdb_StoreMiss_ReturnsNotFound_NotCached()
    {
        var store = new Mock<IPosterImageStore>();
        store.Setup(s => s.GetOrFetchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PosterImageBlob?)null);
        var controller = new PostersController().WithContext();

        var result = await controller.GetTmdb("w500", "abc.jpg", store.Object, CacheEnabled, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal("no-store", controller.Response.Headers.CacheControl);
        Assert.False(controller.Response.Headers.ContainsKey("ETag"));
    }

    [Fact]
    public async Task GetTmdb_MatchingIfNoneMatch_Returns304_WithoutReadingStore()
    {
        var key = MoviePicker.Api.Application.Posters.TmdbPosterUrlNormalizer.ComputeKey(
            "https://image.tmdb.org/t/p/w500/abc.jpg");
        var store = new Mock<IPosterImageStore>();
        var controller = new PostersController().WithContext();
        controller.Request.Headers.IfNoneMatch = $"\"{key}\"";

        var result = await controller.GetTmdb("w500", "abc.jpg", store.Object, CacheEnabled, CancellationToken.None);

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status304NotModified, status.StatusCode);
        store.Verify(s => s.GetOrFetchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetTmdb_PosterCacheDisabled_RedirectsToTheTmdbCdn()
    {
        var controller = new PostersController().WithContext();

        var result = await controller.GetTmdb("w500", "abc.jpg", new DisabledPosterImageStore(), CacheDisabled, CancellationToken.None);

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Equal("https://image.tmdb.org/t/p/w500/abc.jpg", redirect.Url);
        Assert.False(redirect.Permanent);
        Assert.Equal("public,max-age=86400", controller.Response.Headers.CacheControl);
        Assert.False(controller.Response.Headers.ContainsKey("ETag"));
    }

    [Theory]
    [InlineData("w500", "../secrets.jpg")]
    [InlineData("w500", "..%2Fsecrets.jpg")]
    [InlineData("big", "abc.jpg")]
    [InlineData("w500", "abc.svg")]
    public async Task GetTmdb_PosterCacheDisabled_InvalidSegments_ReturnNotFound(string size, string file)
    {
        var controller = new PostersController().WithContext();

        var result = await controller.GetTmdb(size, file, new DisabledPosterImageStore(), CacheDisabled, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetTmdb_StoreFailure_LeavesNoImmutableCacheHeaders()
    {
        var store = new Mock<IPosterImageStore>();
        store.Setup(s => s.GetOrFetchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("database unreachable"));
        var sut = new PostersController().WithContext();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.GetTmdb("w500", "abc.jpg", store.Object, CacheEnabled, CancellationToken.None));

        Assert.False(sut.Response.Headers.ContainsKey("Cache-Control"));
        Assert.False(sut.Response.Headers.ContainsKey("ETag"));
    }
}
