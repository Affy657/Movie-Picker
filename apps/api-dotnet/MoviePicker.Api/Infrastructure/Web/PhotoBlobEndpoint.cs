using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Web;

public static class PhotoBlobEndpoint
{
    public static async Task<IActionResult> ServeAsync(
        ControllerBase controller,
        string key,
        IPhotoBlobRepository photos,
        CancellationToken ct)
    {
        if (!AvatarPhoto.IsValidKey(key))
            return controller.NotFound();

        var photo = await photos.GetByKeyAsync(key, ct);
        if (photo is null)
        {
            ConditionalGet.Unstamp(controller.Response);
            return controller.NotFound();
        }

        var entityTag = $"\"{key}\"";
        ConditionalGet.StampImmutable(controller.Response, entityTag);
        return ConditionalGet.IsNotModified(controller.Request, entityTag)
            ? controller.StatusCode(StatusCodes.Status304NotModified)
            : controller.File(photo.Data, photo.ContentType);
    }
}
