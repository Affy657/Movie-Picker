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
                "ALLOWED_ORIGINS is required outside development (comma-separated list of front URLs, e.g. https://www.example.com).");
        }

        if (string.IsNullOrWhiteSpace(app.Configuration["MONGODB_URI"]))
        {
            throw new InvalidOperationException(
                "MONGODB_URI is required outside development. On GCP: a Secret Manager secret referenced by Cloud Run, or an environment variable for a manual deployment.");
        }

        var emailProvider = app.Configuration["EMAIL_PROVIDER"]?.Trim();
        if (!string.Equals(emailProvider, "resend", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(app.Configuration["RESEND_API_KEY"]))
        {
            throw new InvalidOperationException(
                "EMAIL_PROVIDER=resend and RESEND_API_KEY are required outside development: without them the API falls back to the log sender, "
                + "which writes password reset links, token included, to the logs instead of sending them.");
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
