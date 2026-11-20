using MoviePicker.Api.Application.Avatars;

namespace MoviePicker.Api.Application.Banners;

public static class BannerPhotoImage
{
    public const int MinWidth = 1280;
    public const int MaxWidth = 1920;
    public const int MaxBytes = 600_000;
    public const int MaxBase64Length = (MaxBytes + 2) / 3 * 4;

    private const int RatioWidth = 16;
    private const int RatioHeight = 9;
    private const int RatioTolerance = RatioWidth;

    public static AvatarPhotoFormat? AcceptedFormatOf(ReadOnlySpan<byte> bytes) =>
        bytes.Length is > 0 and <= MaxBytes && AvatarPhotoImage.Inspect(bytes) is { } format && HasAcceptedSize(format)
            ? format
            : null;

    private static bool HasAcceptedSize(AvatarPhotoFormat format) =>
        format.Width is >= MinWidth and <= MaxWidth
        && Math.Abs((format.Width * RatioHeight) - (format.Height * RatioWidth)) <= RatioTolerance;
}
