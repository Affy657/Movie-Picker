using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ProductionStartupValidationTests
{
    private static WebApplication BuildApp(string environment, string? allowedOrigins, string? mongoUri)
    {
        var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions { EnvironmentName = environment });
        builder.Configuration["ALLOWED_ORIGINS"] = allowedOrigins;
        builder.Configuration["MONGODB_URI"] = mongoUri;
        return builder.Build();
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
}
