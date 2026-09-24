using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Logging.Console;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Web;
using Sentry;
using Sentry.Extensibility;
using Sentry.Extensions.Logging;

EnvLoader.LoadFromEnvFileIfExists();

var builder = WebApplication.CreateBuilder(args);

builder.AddSharedDataProtection();

builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Limits.MaxRequestBodySize = RequestBodyLimits.DefaultBytes;
});

if (!builder.Environment.IsDevelopment())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole(options => options.FormatterName = CloudRunJsonConsoleFormatter.FormatterName);
    builder.Logging.AddConsoleFormatter<CloudRunJsonConsoleFormatter, JsonConsoleFormatterOptions>(options =>
    {
        options.IncludeScopes = true;
        options.TimestampFormat = "O";
        options.JsonWriterOptions = new JsonWriterOptions { Indented = false };
    });
    builder.Logging.SetMinimumLevel(LogLevel.Information);
    builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
    builder.Logging.AddFilter("Microsoft.AspNetCore.Routing", LogLevel.Warning);
}

var sentryDsn = builder.Configuration["SENTRY_DSN"];
if (!string.IsNullOrWhiteSpace(sentryDsn))
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.Environment = builder.Configuration["SENTRY_ENVIRONMENT"] ?? builder.Environment.EnvironmentName;
        options.Release = builder.Configuration["SENTRY_RELEASE"];
        options.SendDefaultPii = false;
        options.MaxRequestBodySize = RequestSize.None;
        options.MinimumBreadcrumbLevel = LogLevel.None;
        options.MinimumEventLevel = LogLevel.Error;
        options.AddLogEntryFilter(SentryBeforeSend.IsLogNoise);
        options.AddExceptionFilterForType<AuthenticationFailureException>();
        options.SetBeforeSend(SentryBeforeSend.Prepare);
        options.SetBeforeBreadcrumb(SentryBeforeSend.RedactBreadcrumb);
        options.TracesSampler = context => SentryBeforeSend.SampleTrace(context.TransactionContext.Name);
        var revision = Environment.GetEnvironmentVariable("K_REVISION");
        if (!string.IsNullOrWhiteSpace(revision))
            options.ServerName = revision;
    });
}

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);

builder.Services.AddMoviePicker(builder.Configuration, builder.Environment);
builder.Services.AddMoviePickerAuthentication(builder.Configuration);
builder.Services.AddMoviePickerRateLimiter(builder.Environment);
builder.Services.AddMoviePickerRequestTimeouts();

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
        o.Filters.Add<SharedRateLimitFilter>();
    })
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    })
    .ConfigureApiBehaviorOptions(o => o.SuppressModelStateInvalidFilter = true);
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
                "Business resources under **`/api/v1`** (health: `GET /health`). See `ApiRoutePrefix.V1` on the server and the prefix in `apps/web/src/shared/api/client.ts`."
        });
});

var app = builder.Build();

ProductionStartupValidation.Validate(app);

app.UseForwardedHeaders();

app.UseResponseCompression();

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
app.UseExceptionHandler(errorApp => errorApp.Run(UnhandledExceptionResponse.WriteAsync));
app.UseRequestTimeouts();
app.UseAuthentication();
app.UseRateLimiter();
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
            "Resource not found",
            ErrorCodes.NotFound);
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
