namespace MoviePicker.Api.Application.Ports;

public interface IGoogleProfilePhotoSource
{
    Task<byte[]?> FetchAsync(string accessToken, CancellationToken ct = default);
}
