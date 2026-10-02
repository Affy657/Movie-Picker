namespace MoviePicker.Api.Tests.Builders;

public static class StartingLine
{
    public static async Task RunTogetherAsync(params Func<Task>[] racers)
    {
        using var startingLine = new Barrier(racers.Length);
        await Task.WhenAll(racers.Select(racer => Task.Factory.StartNew(
            () =>
            {
                startingLine.SignalAndWait();
                return racer();
            },
            CancellationToken.None,
            TaskCreationOptions.LongRunning,
            TaskScheduler.Default).Unwrap()));
    }
}
