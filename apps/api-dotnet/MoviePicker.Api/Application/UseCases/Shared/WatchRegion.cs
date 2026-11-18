using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Application.UseCases.Shared;

internal static class WatchRegion
{
    public static string Of(string? region) =>
        string.IsNullOrWhiteSpace(region)
            ? MoviePickerOptions.DefaultWatchProvidersRegion
            : region.Trim().ToUpperInvariant();
}
