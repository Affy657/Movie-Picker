using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Infrastructure.Web;

public static class ProductionStartupValidation
{
    public static void Validate(WebApplication app)
    {
        EnsureTimeZoneData(EventSchedule.ParisTimeZone);

        if (app.Environment.IsDevelopment())
            return;

        if (string.IsNullOrWhiteSpace(app.Configuration["ALLOWED_ORIGINS"]))
        {
            throw new InvalidOperationException(
                "ALLOWED_ORIGINS is required outside development (comma-separated list of front URLs, e.g. https://d123.cloudfront.net).");
        }

        if (string.IsNullOrWhiteSpace(app.Configuration["MONGODB_URI"]))
        {
            throw new InvalidOperationException(
                "MONGODB_URI is required outside development. On GCP: a Secret Manager secret referenced by Cloud Run, or an environment variable for a manual deployment.");
        }
    }

    public static void EnsureTimeZoneData(TimeZoneInfo parisTimeZone)
    {
        if (parisTimeZone.BaseUtcOffset != TimeSpan.Zero)
            return;

        throw new InvalidOperationException(
            "Europe/Paris could not be resolved, so every event would be scheduled in UTC. "
            + "The runtime image is missing tzdata: use a base image that ships it (the chiseled images need the -extra variant).");
    }
}
