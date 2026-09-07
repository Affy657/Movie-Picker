using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class PostersControllerTests
{
    private static readonly string ValidKey = new('a', 64);

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
}
