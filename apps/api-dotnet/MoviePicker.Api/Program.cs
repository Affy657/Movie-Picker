using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.HttpOverrides;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Web;
using Sentry;

EnvLoader.LoadFromEnvFileIfExists();

var builder = WebApplication.CreateBuilder(args);

builder.AddSharedDataProtection();

builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

var sentryDsn = builder.Configuration["SENTRY_DSN"];
if (!string.IsNullOrWhiteSpace(sentryDsn))
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.Environment = builder.Configuration["SENTRY_ENVIRONMENT"] ?? builder.Environment.EnvironmentName;
        options.Release = builder.Configuration["SENTRY_RELEASE"];
        options.TracesSampleRate = 0.1;
        options.SendDefaultPii = false;
        options.SetBeforeSend((SentryEvent sentryEvent) =>
        {
            sentryEvent.User.IpAddress = null;
            sentryEvent.User.Email = null;
            sentryEvent.User.Username = null;
            return sentryEvent;
        });
    });
}

if (!builder.Environment.IsDevelopment())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole(options =>
    {
        options.IncludeScopes = true;
        options.TimestampFormat = "O";
        options.JsonWriterOptions = new JsonWriterOptions { Indented = false };
    });
    builder.Logging.SetMinimumLevel(LogLevel.Information);
    builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
    builder.Logging.AddFilter("Microsoft.AspNetCore.Routing", LogLevel.Warning);
}

builder.Services.AddMoviePicker(builder.Configuration, builder.Environment);
builder.Services.AddMoviePickerAuthentication(builder.Configuration);
builder.Services.AddMoviePickerRateLimiter(builder.Environment);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services
    .AddControllers(o =>
    {
        o.Filters.Add<ValidationErrorFilter>();
        o.Filters.Add<MoviePickerExceptionFilter>();
    })
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc(
        "v1",
        new Microsoft.OpenApi.OpenApiInfo
        {
            Title = "Movie Picker API",
            Version = "v1",
            Description =
                "Ressources métier sous **`/api/v1`** (santé : `GET /health`). Voir `ApiRoutePrefix.V1` côté serveur et préfixe dans `apps/web/src/api/client.ts`."
        });
});

var app = builder.Build();

ProductionStartupValidation.Validate(app);

app.UseForwardedHeaders();

app.UseMiddleware<CorrelationIdMiddleware>();

app.UseMiddleware<SecurityHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseMiddleware<StructuredHttpRequestLoggingMiddleware>();
app.UseCors(MoviePicker.Api.Infrastructure.ServiceCollectionExtensions.CorsPolicyFront);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.UseStatusCodePages(async context =>
{
    if (context.HttpContext.Response.StatusCode == 404 &&
        !context.HttpContext.Response.HasStarted &&
        string.IsNullOrEmpty(context.HttpContext.Response.ContentType))
    {
        context.HttpContext.Response.ContentType = "application/json";
        var json = ApiErrorJson.Serialize(
            context.HttpContext,
            StatusCodes.Status404NotFound,
            "Ressource introuvable");
        await context.HttpContext.Response.WriteAsync(json);
    }
});

app.MapControllers();

app.MapGet("/", () => Results.Json(new
{
    name = "Movie Picker API",
    health = "/health",
    ready = "/health/ready",
    api = $"/{ApiRoutePrefix.V1}",
    docs = app.Environment.IsDevelopment() ? "/swagger" : (object?)null
}));

await app.RunAsync();

public partial class Program
{
    protected Program() { }
}
