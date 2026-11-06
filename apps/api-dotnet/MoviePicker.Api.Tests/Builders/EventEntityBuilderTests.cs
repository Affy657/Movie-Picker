using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.Tests.Builders;

public sealed class EventEntityBuilderTests
{
    [Fact]
    public void Build_DefaultNight_StartsAboutAYearAfterTheSystemClock()
    {
        var evt = new EventEntityBuilder().Build();

        Assert.True(EventSchedule.TryGetStartUtc(evt.Date, evt.Time, out var startUtc));
        Assert.InRange((startUtc - DateTimeOffset.UtcNow).TotalDays, 360, 370);
    }
}
