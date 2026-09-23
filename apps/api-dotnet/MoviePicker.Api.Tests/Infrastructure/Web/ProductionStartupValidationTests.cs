using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ProductionStartupValidationTests
{
    private static WebApplication BuildApp(
        string environment,
        string? allowedOrigins,
        string? mongoUri,
        string? emailProvider = "resend",
        string? resendApiKey = "re_test")
    {
        var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions { EnvironmentName = environment });
        builder.Configuration["ALLOWED_ORIGINS"] = allowedOrigins;
        builder.Configuration["MONGODB_URI"] = mongoUri;
        builder.Configuration["EMAIL_PROVIDER"] = emailProvider;
        builder.Configuration["RESEND_API_KEY"] = resendApiKey;
        return builder.Build();
    }

    [Theory]
    [InlineData(null, "re_test")]
    [InlineData("log", "re_test")]
    [InlineData("resend", "")]
    [InlineData("resend", null)]
    public async Task Validate_Production_WithoutARealEmailProvider_Throws(string? emailProvider, string? resendApiKey)
    {
        await using var app = BuildApp(
            Environments.Production,
            "https://app.example",
            "mongodb://localhost:27017",
            emailProvider,
            resendApiKey);

        var ex = Assert.Throws<InvalidOperationException>(() => ProductionStartupValidation.Validate(app));

        Assert.Contains("EMAIL_PROVIDER=resend", ex.Message);
    }

    [Fact]
    public async Task Validate_Development_DoesNotThrow_EvenWithoutConfig()
    {
        await using var app = BuildApp(Environments.Development, allowedOrigins: "", mongoUri: "");

        var ex = Record.Exception(() => ProductionStartupValidation.Validate(app));

        Assert.Null(ex);
    }

    [Fact]
    public async Task Validate_Production_WithAllRequiredConfig_DoesNotThrow()
    {
        await using var app = BuildApp(Environments.Production, "https://app.example", "mongodb://localhost:27017");

        var ex = Record.Exception(() => ProductionStartupValidation.Validate(app));

        Assert.Null(ex);
    }

    [Fact]
    public async Task Validate_Production_MissingAllowedOrigins_Throws()
    {
        await using var app = BuildApp(Environments.Production, allowedOrigins: "", mongoUri: "mongodb://localhost:27017");

        var ex = Assert.Throws<InvalidOperationException>(() => ProductionStartupValidation.Validate(app));

        Assert.Contains("ALLOWED_ORIGINS", ex.Message);
    }

    [Fact]
    public async Task Validate_Production_MissingMongoUri_Throws()
    {
        await using var app = BuildApp(Environments.Production, "https://app.example", mongoUri: "");

        var ex = Assert.Throws<InvalidOperationException>(() => ProductionStartupValidation.Validate(app));

        Assert.Contains("MONGODB_URI", ex.Message);
    }

    [Fact]
    public void EnsureTimeZoneData_RefusesTheUtcFallback()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupValidation.EnsureTimeZoneData(TimeZoneInfo.Utc));

        Assert.Contains("Europe/Paris", ex.Message);
        Assert.Contains("tzdata", ex.Message);
    }

    [Fact]
    public void EnsureTimeZoneData_AcceptsAResolvedParisZone()
    {
        var ex = Record.Exception(
            () => ProductionStartupValidation.EnsureTimeZoneData(TimeZoneInfo.FindSystemTimeZoneById("Europe/Paris")));

        Assert.Null(ex);
    }
}
