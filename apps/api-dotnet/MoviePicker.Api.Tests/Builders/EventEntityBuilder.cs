using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Tests.Builders;

/// <summary>
/// Builder pour les tests unitaires (données d’événement cohérentes).
/// </summary>
public sealed class EventEntityBuilder
{
    private string _id = "evt-1";
    private string _title = "Soirée test";
    private string _slug = "soiree-test";
    private string _hostToken = "host-token";
    private string _date = "2030-06-01";
    private string _time = "20:00";
    private DateTimeOffset? _closedAt;

    public EventEntityBuilder WithId(string id)
    {
        _id = id;
        return this;
    }

    public EventEntityBuilder WithSlug(string slug)
    {
        _slug = slug;
        return this;
    }

    public EventEntityBuilder WithTitle(string title)
    {
        _title = title;
        return this;
    }

    public EventEntityBuilder Closed()
    {
        _closedAt = DateTimeOffset.UtcNow;
        return this;
    }

    public Event Build()
    {
        var now = DateTimeOffset.UtcNow;
        return new Event
        {
            Id = _id,
            Title = _title,
            Slug = _slug,
            HostToken = _hostToken,
            Date = _date,
            Time = _time,
            Config = new EventConfig(),
            ClosedAt = _closedAt,
            WinnerMovieId = null,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }
}
