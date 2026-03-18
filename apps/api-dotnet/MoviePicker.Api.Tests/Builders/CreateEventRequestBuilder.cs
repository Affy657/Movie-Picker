using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Tests.Builders;

public sealed class CreateEventRequestBuilder
{
    private string _title = "Soirée";
    private string _date = "2030-01-01";
    private string _time = "20:00";

    public CreateEventRequestBuilder WithTitle(string title)
    {
        _title = title;
        return this;
    }

    public CreateEventRequestBuilder WithDate(string date)
    {
        _date = date;
        return this;
    }

    public CreateEventRequestBuilder WithTime(string time)
    {
        _time = time;
        return this;
    }

    public CreateEventRequest Build() =>
        new() { Title = _title, Date = _date, Time = _time };
}
