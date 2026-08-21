using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public static class MyEventListLifecycle
{
    public const string Upcoming = "upcoming";
    public const string Live = "live";
    public const string Pending = "pending";
    public const string Finished = "finished";

    public static string Compute(Event e, DateTimeOffset utcNow) => FromLifecycle(e.Lifecycle(utcNow));

    public static string FromLifecycle(EventLifecycle lifecycle) => lifecycle switch
    {
        EventLifecycle.Upcoming => Upcoming,
        EventLifecycle.Live => Live,
        EventLifecycle.Pending => Pending,
        _ => Finished
    };
}
