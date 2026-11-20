using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class LetterboxdExportEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Header = "Date,Name,Year,Letterboxd URI";
    private const int StubFilmId = 999_001;
    private const int OtherStubFilmId = 999_002;

    private readonly MoviePickerApplicationFactory _factory;

    public LetterboxdExportEndpointsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> SignedInAsync()
    {
        var client = _factory.CreateClient();
        var registered = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = $"u{Guid.NewGuid():N}@test.local", Password = "abcd1234", DisplayName = "Cinéphile" });
        registered.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(client, registered);
        return client;
    }

    private static string ExportZip()
    {
        using var buffer = new MemoryStream();
        using (var archive = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            Write(archive, "watchlist.csv", $"{Header}\n2025-01-01,Film E2E Stub,2024,https://boxd.it/a\n");
            Write(archive, "watched.csv", $"{Header}\n2025-02-01,Autre film test,2023,https://boxd.it/b\n2025-02-02,Titre ambigu,2020,https://boxd.it/c\n");
            Write(archive, "ratings.csv", $"{Header},Rating\n2025-02-01,Autre film test,2023,https://boxd.it/b,4\n");
            Write(archive, "diary.csv", $"{Header},Rating,Rewatch,Tags,Watched Date\n2025-02-01,Autre film test,2023,https://boxd.it/d,4,,,2025-01-31\n");
            Write(archive, "deleted/watchlist.csv", $"{Header}\n2025-01-01,Autre film test,2023,https://boxd.it/e\n");
        }

        return Convert.ToBase64String(buffer.ToArray());
    }

    private static void Write(ZipArchive archive, string path, string content)
    {
        using var writer = new StreamWriter(archive.CreateEntry(path).Open(), Encoding.UTF8);
        writer.Write(content);
    }

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return JsonElement.Parse(await response.Content.ReadAsStringAsync());
    }

    private static async Task<JsonElement> ImportAsync(HttpClient client, string target, params object[] rows) =>
        await BodyAsync(await client.PostAsJsonAsync("/api/v1/letterboxd/export/import", new { target, rows }));

    [Fact]
    public async Task ReadThenImport_BringsTheWholeExport_AndAsksOnlyForTheAmbiguousTitles()
    {
        var client = await SignedInAsync();

        var export = await BodyAsync(await client.PostAsJsonAsync(
            "/api/v1/letterboxd/export/read",
            new { files = new[] { new { name = "letterboxd-cinephile.zip", base64Content = ExportZip() } } }));

        Assert.Equal(["Film E2E Stub"], export.GetProperty("watchlist").EnumerateArray().Select(film => film.GetProperty("title").GetString()));
        var watched = export.GetProperty("watched").EnumerateArray().ToList();
        Assert.Equal(["Autre film test", "Titre ambigu"], watched.Select(film => film.GetProperty("title").GetString()));
        Assert.Equal((8, "2025-01-31"), (watched[0].GetProperty("rating").GetInt32(), watched[0].GetProperty("watchedOn").GetString()));

        var watchedReport = await ImportAsync(
            client,
            "watched",
            new { rowIndex = 1, title = "Autre film test", year = "2023", rating = 8, watchedOn = "2025-01-31" },
            new { rowIndex = 2, title = "Titre ambigu", year = "2020" });
        var watchlistReport = await ImportAsync(client, "watchlist", new { rowIndex = 3, title = "Film E2E Stub", year = "2024" });
        var again = await ImportAsync(client, "watchlist", new { rowIndex = 3, title = "Film E2E Stub", year = "2024" });

        Assert.Equal((1, 0), (watchedReport.GetProperty("added").GetInt32(), watchedReport.GetProperty("alreadyPresent").GetInt32()));
        var choice = Assert.Single(watchedReport.GetProperty("pendingChoices").EnumerateArray());
        Assert.Equal(("Titre ambigu", "watched", 2), (choice.GetProperty("title").GetString(), choice.GetProperty("target").GetString(), choice.GetProperty("rowIndex").GetInt32()));
        Assert.Equal(1, watchlistReport.GetProperty("added").GetInt32());
        Assert.Equal((0, 1), (again.GetProperty("added").GetInt32(), again.GetProperty("alreadyPresent").GetInt32()));

        var status = await BodyAsync(await client.GetAsync($"/api/v1/watched/{OtherStubFilmId}"));
        Assert.Equal(("elsewhere", 8), (status.GetProperty("status").GetString(), status.GetProperty("rating").GetInt32()));
        Assert.Equal(new DateTimeOffset(2025, 1, 31, 12, 0, 0, TimeSpan.Zero), status.GetProperty("watchedAt").GetDateTimeOffset());
        var toWatch = await BodyAsync(await client.GetAsync("/api/v1/watchlist"));
        Assert.Contains(toWatch.GetProperty("items").EnumerateArray(), item => item.GetProperty("tmdbId").GetInt32() == StubFilmId);
    }

    [Fact]
    public async Task Read_AFileThatIsNotTheExport_IsRefused()
    {
        var client = await SignedInAsync();

        var response = await client.PostAsJsonAsync(
            "/api/v1/letterboxd/export/read",
            new { files = new[] { new { name = "notes.txt", base64Content = Convert.ToBase64String(Encoding.UTF8.GetBytes("hello")) } } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("letterboxd_export_unreadable", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Import_MoreRowsThanABatch_IsRefused()
    {
        var client = await SignedInAsync();
        var rows = Enumerable.Range(1, LetterboxdExportImportRequest.MaxRows + 1)
            .Select(index => new { rowIndex = index, title = $"Film {index}", year = "2001" })
            .ToArray();

        var response = await client.PostAsJsonAsync("/api/v1/letterboxd/export/import", new { target = "watched", rows });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
