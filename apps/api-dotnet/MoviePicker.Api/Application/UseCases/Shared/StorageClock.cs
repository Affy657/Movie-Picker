namespace MoviePicker.Api.Application.UseCases.Shared;

public static class StorageClock
{
    public static DateTimeOffset StorageNow(this TimeProvider clock)
    {
        var now = clock.GetUtcNow();
        return new DateTimeOffset(now.Ticks - (now.Ticks % TimeSpan.TicksPerMillisecond), now.Offset);
    }
}
