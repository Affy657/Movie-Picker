namespace MoviePicker.Api.Infrastructure.Web;

public static class ProductionStartupValidation
{
    public static void Validate(WebApplication app)
    {
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
}
