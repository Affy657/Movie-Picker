namespace MoviePicker.Api.Application.Ports;

public interface IDataMigration
{
    string Id { get; }

    Task<long> ExecuteAsync(CancellationToken ct = default);
}
