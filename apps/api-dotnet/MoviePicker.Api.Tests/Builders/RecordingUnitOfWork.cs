using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Tests.Builders;

public sealed class RecordingUnitOfWork : IUnitOfWork
{
    public int Executions { get; private set; }

    public bool IsExecuting { get; private set; }

    public async Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default)
    {
        Executions++;
        IsExecuting = true;
        try
        {
            await work(ct);
        }
        finally
        {
            IsExecuting = false;
        }
    }
}
