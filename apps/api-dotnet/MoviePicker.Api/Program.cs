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
app.MapControllers();

app.MapGet("/", () => Results.Json(new
{
    name = "Movie Picker API",
    health = "/health",
    docs = app.Environment.IsDevelopment() ? "/swagger" : (object?)null
}));

app.Run();
