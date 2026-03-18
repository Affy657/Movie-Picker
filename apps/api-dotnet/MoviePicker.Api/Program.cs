using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Web;

EnvLoader.LoadFromEnvFileIfExists();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMoviePicker(builder.Configuration);
builder.Services
    .AddControllers(o =>
    {
        o.Filters.Add<ValidationErrorFilter>();
        o.Filters.Add<MoviePickerExceptionFilter>();
    })
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "Movie Picker API", Version = "v1" }));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(ServiceCollectionExtensions.CorsPolicyFront);
app.UseAuthorization();

// Toujours renvoyer du JSON pour 404 (éviter une page HTML en prod)
app.UseStatusCodePages(async context =>
{
    if (context.HttpContext.Response.StatusCode == 404 &&
        !context.HttpContext.Response.HasStarted &&
        string.IsNullOrEmpty(context.HttpContext.Response.ContentType))
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"error\":\"Ressource introuvable\"}");
    }
});

app.MapControllers();

app.MapGet("/", () => Results.Json(new
{
    name = "Movie Picker API",
    health = "/health",
    docs = app.Environment.IsDevelopment() ? "/swagger" : (object?)null
}));

app.Run();
