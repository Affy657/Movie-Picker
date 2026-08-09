using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdCsvParserTests
{
    [Fact]
    public void Parse_ValidCsv_ReturnsRows()
    {
        var csv = "Date,Name,Year,Letterboxd URI\n"
            + "2026-01-01,Matrix,1999,https://letterboxd.com/film/matrix/\n"
            + "2026-01-02,Inception,2010,https://letterboxd.com/film/inception/\n";

        var result = LetterboxdCsvParser.Parse(csv);

        Assert.Equal(2, result.Rows.Count);
        Assert.Equal("Matrix", result.Rows[0].Title);
        Assert.Equal("1999", result.Rows[0].Year);
        Assert.Equal(1, result.Rows[0].RowIndex);
        Assert.Equal(2, result.TotalParsed);
        Assert.Equal(0, result.TotalTruncated);
    }

    [Fact]
    public void Parse_QuotedTitleWithComma_IsHandled()
    {
        var csv = "Date,Name,Year,Letterboxd URI\n"
            + "2026-01-01,\"O Brother, Where Art Thou?\",2000,https://letterboxd.com/film/o-brother/\n";

        var result = LetterboxdCsvParser.Parse(csv);

        Assert.Equal("O Brother, Where Art Thou?", result.Rows[0].Title);
    }

    [Fact]
    public void Parse_MissingRequiredColumns_ThrowsBadRequest()
    {
        var csv = "Date,Title\n2026-01-01,Matrix\n";

        Assert.Throws<BadRequestException>(() => LetterboxdCsvParser.Parse(csv));
    }

    [Fact]
    public void Parse_EmptyCsv_ThrowsBadRequest()
    {
        Assert.Throws<BadRequestException>(() => LetterboxdCsvParser.Parse(""));
    }

    [Fact]
    public void Parse_RowsMissingTitle_AreSkipped()
    {
        var csv = "Date,Name,Year,Letterboxd URI\n"
            + "2026-01-01,,1999,https://letterboxd.com/film/x/\n"
            + "2026-01-02,Inception,2010,https://letterboxd.com/film/inception/\n";

        var result = LetterboxdCsvParser.Parse(csv);

        Assert.Single(result.Rows);
        Assert.Equal("Inception", result.Rows[0].Title);
    }

    [Fact]
    public void Parse_DuplicateTitleYear_IsDeduplicated()
    {
        var csv = "Date,Name,Year,Letterboxd URI\n"
            + "2026-01-01,Matrix,1999,https://letterboxd.com/film/matrix/\n"
            + "2026-01-02,matrix,1999,https://letterboxd.com/film/matrix/\n";

        var result = LetterboxdCsvParser.Parse(csv);

        Assert.Single(result.Rows);
    }

    [Fact]
    public void Parse_MoreRowsThanMax_ReportsTruncation()
    {
        var lines = new List<string> { "Name,Year" };
        for (var i = 0; i < LetterboxdCsvParser.MaxRows + 10; i++)
            lines.Add($"Film {i},2000");
        var csv = string.Join("\n", lines);

        var result = LetterboxdCsvParser.Parse(csv);

        Assert.Equal(LetterboxdCsvParser.MaxRows, result.Rows.Count);
        Assert.Equal(LetterboxdCsvParser.MaxRows + 10, result.TotalParsed);
        Assert.Equal(10, result.TotalTruncated);
    }
}
