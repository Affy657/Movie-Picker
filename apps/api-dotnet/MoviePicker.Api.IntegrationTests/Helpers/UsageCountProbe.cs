using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.IntegrationTests.Helpers;

public static class UsageCountProbe
{
    public static async Task<long> ReadTodayAsync(MoviePickerApplicationFactory factory, string metric, string variant)
    {
        using var scope = factory.Services.CreateScope();
        var day = EventRecurrence.TodayInParis(scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow());
        var id = $"{day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}|{metric}|{variant}";
        var stored = await scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<UsageCountDocument>(MongoUsageCountRepository.CollectionName)
            .Find(document => document.Id == id)
            .FirstOrDefaultAsync();
        return stored?.Count ?? 0;
    }
}
