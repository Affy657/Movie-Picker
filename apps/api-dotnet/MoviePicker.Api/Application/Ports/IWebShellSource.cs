namespace MoviePicker.Api.Application.Ports;

public interface IWebShellSource
{
    Task<string?> GetShellAsync(CancellationToken ct = default);
}
