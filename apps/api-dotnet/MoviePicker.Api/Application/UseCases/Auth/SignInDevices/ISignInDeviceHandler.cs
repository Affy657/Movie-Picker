using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth.SignInDevices;

public sealed record SignInDeviceRequest(
    string UserId,
    string? PresentedToken,
    string? UserAgent,
    string? Method,
    CatalogLanguage Language);

public sealed record SignInDevice(string Token, string DeviceId);

public interface ISignInDeviceHandler
{
    Task<SignInDevice> HandleAsync(SignInDeviceRequest request, CancellationToken ct = default);
}
