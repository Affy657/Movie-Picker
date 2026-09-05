namespace MoviePicker.Api.Application.Ports;

public interface IUnitOfWork
{
    Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default);
}
