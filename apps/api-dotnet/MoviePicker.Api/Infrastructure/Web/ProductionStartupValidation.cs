namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>
/// Garantit qu’on ne démarre pas en prod/staging avec une config incohérente (Mongo in-memory implicite).
/// </summary>
public static class ProductionStartupValidation
{
    public static void Validate(WebApplication app)
    {
        if (app.Environment.IsDevelopment())
            return;

        if (string.IsNullOrWhiteSpace(app.Configuration["ALLOWED_ORIGINS"]))
        {
            throw new InvalidOperationException(
                "ALLOWED_ORIGINS est obligatoire hors développement (liste d'URLs du front séparées par des virgules, ex. https://d123.cloudfront.net).");
        }

        if (string.IsNullOrWhiteSpace(app.Configuration["MONGODB_URI"]))
        {
            throw new InvalidOperationException(
                "MONGODB_URI est obligatoire hors développement. En GCP : secret Secret Manager référencé par Cloud Run, ou variable d'environnement pour un déploiement manuel.");
        }
    }
}
