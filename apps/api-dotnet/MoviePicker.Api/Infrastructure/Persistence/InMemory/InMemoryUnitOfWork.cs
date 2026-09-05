using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUnitOfWork : IUnitOfWork
{
    private readonly SemaphoreSlim _gate = new(1, 1);

    public async Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await work(ct);
        }
        finally
        {
            _gate.Release();
        }
    }
}
