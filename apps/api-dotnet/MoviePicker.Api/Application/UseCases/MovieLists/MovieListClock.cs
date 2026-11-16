namespace MoviePicker.Api.Application.UseCases.MovieLists;

public static class MovieListClock
{
    public static DateTimeOffset StorageNow(this TimeProvider clock)
    {
        var now = clock.GetUtcNow();
        return new DateTimeOffset(now.Ticks - (now.Ticks % TimeSpan.TicksPerMillisecond), now.Offset);
    }
}
