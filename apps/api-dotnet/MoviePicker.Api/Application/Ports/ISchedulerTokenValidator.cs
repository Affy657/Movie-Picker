namespace MoviePicker.Api.Application.Ports;

public interface ISchedulerTokenValidator
{
    bool IsConfigured { get; }

    bool IsValid(string? presentedToken);
}
