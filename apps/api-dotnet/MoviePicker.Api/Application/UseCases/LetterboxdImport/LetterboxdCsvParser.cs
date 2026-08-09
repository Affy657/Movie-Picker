using System.Text;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdCsvRow(int RowIndex, string Title, string Year);

public sealed record LetterboxdCsvParseResult(IReadOnlyList<LetterboxdCsvRow> Rows, int TotalParsed, int TotalTruncated);

public static class LetterboxdCsvParser
{
    public const int MaxRows = 300;

    public static LetterboxdCsvParseResult Parse(string? csv)
    {
        var lines = (csv ?? string.Empty)
            .Split('\n')
            .Select(l => l.TrimEnd('\r'))
            .Where(l => l.Length > 0)
            .ToList();

        if (lines.Count == 0)
            throw new BadRequestException("Fichier CSV vide.");

        var header = SplitLine(lines[0]);
        var nameIndex = header.FindIndex(h => string.Equals(h.Trim(), "Name", StringComparison.OrdinalIgnoreCase));
        var yearIndex = header.FindIndex(h => string.Equals(h.Trim(), "Year", StringComparison.OrdinalIgnoreCase));
        if (nameIndex < 0 || yearIndex < 0)
        {
            throw new BadRequestException(
                "En-tête CSV invalide : colonnes \"Name\" et \"Year\" introuvables. "
                + "Utilisez le fichier watchlist.csv exporté depuis Letterboxd.");
        }

        var dataLines = lines.Skip(1).ToList();
        var totalParsed = dataLines.Count;
        var totalTruncated = Math.Max(0, totalParsed - MaxRows);

        var seen = new HashSet<(string, string)>();
        var rows = new List<LetterboxdCsvRow>();
        var rowIndex = 0;
        foreach (var line in dataLines.Take(MaxRows))
        {
            rowIndex++;
            var fields = SplitLine(line);
            var title = nameIndex < fields.Count ? fields[nameIndex].Trim() : string.Empty;
            var year = yearIndex < fields.Count ? fields[yearIndex].Trim() : string.Empty;
            if (title.Length == 0)
                continue;

            var key = (title.ToLowerInvariant(), year);
            if (!seen.Add(key))
                continue;

            rows.Add(new LetterboxdCsvRow(rowIndex, title, year));
        }

        return new LetterboxdCsvParseResult(rows, totalParsed, totalTruncated);
    }

    private static List<string> SplitLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    current.Append(c);
                }
                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    break;
                case ',':
                    fields.Add(current.ToString());
                    current.Clear();
                    break;
                default:
                    current.Append(c);
                    break;
            }
        }

        fields.Add(current.ToString());
        return fields;
    }
}
