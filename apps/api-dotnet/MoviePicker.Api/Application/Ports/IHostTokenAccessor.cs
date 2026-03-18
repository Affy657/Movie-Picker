namespace MoviePicker.Api.Application.Ports;

public interface IHostTokenAccessor
{
    string? GetHostToken();
}
