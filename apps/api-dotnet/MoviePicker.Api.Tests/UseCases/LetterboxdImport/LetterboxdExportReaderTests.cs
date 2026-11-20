using System.IO.Compression;
using System.Text;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdExportReaderTests
{
    private const string Header = "Date,Name,Year,Letterboxd URI";

    private static byte[] Utf8(string text) => Encoding.UTF8.GetBytes(text);

    private static byte[] Zip(params (string Path, string Content)[] entries)
    {
        using var buffer = new MemoryStream();
        using (var archive = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (path, content) in entries)
            {
                using var writer = new StreamWriter(archive.CreateEntry(path).Open(), new UTF8Encoding(true));
                writer.Write(content);
            }
        }

        return buffer.ToArray();
    }

    private static LetterboxdExport ReadZip(params (string Path, string Content)[] entries) =>
        LetterboxdExportReader.Read([new LetterboxdExportFile("letterboxd-cinephile-2026-11-20.zip", Zip(entries))]);

    [Fact]
    public void Read_MergesWatchedRatingsAndDiary_IntoOneFilmEach()
    {
        var export = ReadZip(
            ("watched.csv", $"{Header}\r\n2024-01-05,Dune,2021,https://boxd.it/a\r\n2025-03-02,Akira,1988,https://boxd.it/b\r\n"),
            ("ratings.csv", $"{Header},Rating\r\n2024-01-06,Dune,2021,https://boxd.it/a,4.5\r\n"),
            ("diary.csv", $"{Header},Rating,Rewatch,Tags,Watched Date\r\n"
                + "2024-01-06,Dune,2021,https://boxd.it/x,4,,,2024-01-04\r\n"
                + "2025-09-01,Dune,2021,https://boxd.it/y,,Yes,,2025-08-30\r\n"
                + "2025-03-02,Akira,1988,https://boxd.it/z,3.5,,,2025-03-01\r\n"));

        Assert.Equal(
            [
                new LetterboxdExportFilm("Dune", "2021", 9, new DateOnly(2025, 8, 30)),
                new LetterboxdExportFilm("Akira", "1988", 7, new DateOnly(2025, 3, 1))
            ],
            export.Watched);
        Assert.Empty(export.Watchlist);
    }

    [Fact]
    public void Read_KeepsTheDateMarkedWatched_WhenTheDiaryHasNoViewing()
    {
        var export = ReadZip(("watched.csv", $"{Header}\n2024-01-05,Heat,1995,https://boxd.it/a\n"));

        Assert.Equal([new LetterboxdExportFilm("Heat", "1995", null, new DateOnly(2024, 1, 5))], export.Watched);
    }

    [Fact]
    public void Read_ParsesQuotedTitles_WithCommasAndQuotes()
    {
        var export = ReadZip(
            ("watchlist.csv", $"{Header}\n2025-01-01,\"Crouching Tiger, Hidden Dragon\",2000,https://boxd.it/a\n"
                + "2025-01-02,\"The \"\"Ghost\"\" Writer\",2010,https://boxd.it/b\n"));

        Assert.Equal(
            ["Crouching Tiger, Hidden Dragon", "The \"Ghost\" Writer"],
            export.Watchlist.Select(film => film.Title));
    }

    [Fact]
    public void Read_IgnoresTheDeletedAndOrphanedCopies_OfTheExport()
    {
        var export = ReadZip(
            ("watchlist.csv", $"{Header}\n2025-01-01,Heat,1995,https://boxd.it/a\n"),
            ("deleted/watchlist.csv", $"{Header}\n2025-01-01,Cats,2019,https://boxd.it/b\n"),
            ("orphaned/watched.csv", $"{Header}\n2025-01-01,Cats,2019,https://boxd.it/b\n"));

        Assert.Equal(["Heat"], export.Watchlist.Select(film => film.Title));
        Assert.Empty(export.Watched);
    }

    [Fact]
    public void Read_KeepsTheFirstCopyOfAList_WhenAnArchiveRepeatsIt()
    {
        var export = ReadZip(
            ("a/watchlist.csv", $"{Header}\n2025-01-01,Heat,1995,https://boxd.it/a\n"),
            ("b/watchlist.csv", $"{Header}\n2025-01-01,Cats,2019,https://boxd.it/b\n"));

        Assert.Equal(["Heat"], export.Watchlist.Select(film => film.Title));
    }

    [Fact]
    public void Read_TakesTheLooseFilesOfAnUnzippedExport_ByTheirName()
    {
        var export = LetterboxdExportReader.Read(
        [
            new LetterboxdExportFile("watchlist.csv", Utf8($"{Header}\n2025-01-01,Heat,1995,https://boxd.it/a\n")),
            new LetterboxdExportFile("WATCHED.CSV", Utf8($"{Header}\n2025-01-01,Akira,1988,https://boxd.it/b\n")),
            new LetterboxdExportFile("profile.csv", Utf8("Username\ncinephile\n"))
        ]);

        Assert.Equal(["Heat"], export.Watchlist.Select(film => film.Title));
        Assert.Equal(["Akira"], export.Watched.Select(film => film.Title));
    }

    [Theory]
    [InlineData("notes.txt")]
    [InlineData("profile.csv")]
    public void Read_WithoutAnyListOfTheExport_IsRefused(string name)
    {
        var error = Assert.Throws<BadRequestException>(
            () => LetterboxdExportReader.Read([new LetterboxdExportFile(name, Utf8("hello"))]));

        Assert.Equal(ErrorCodes.LetterboxdExportUnreadable, error.Reason);
    }

    [Fact]
    public void Read_ABrokenArchive_IsRefused()
    {
        var broken = new byte[] { 0x50, 0x4B, 0x03, 0x04, 0x00, 0x01, 0x02 };

        var error = Assert.Throws<BadRequestException>(
            () => LetterboxdExportReader.Read([new LetterboxdExportFile("export.zip", broken)]));

        Assert.Equal(ErrorCodes.LetterboxdExportUnreadable, error.Reason);
    }
}
