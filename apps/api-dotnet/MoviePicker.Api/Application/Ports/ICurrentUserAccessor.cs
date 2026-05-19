namespace MoviePicker.Api.Application.Ports;

public interface ICurrentUserAccessor
{
    string? GetUserId();
}
