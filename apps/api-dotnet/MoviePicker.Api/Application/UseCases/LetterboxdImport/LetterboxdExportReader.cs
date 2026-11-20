using System.Globalization;
using System.IO.Compression;
using System.Text;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdExportFile(string Name, byte[] Content);

public sealed record LetterboxdExportFilm(string Title, string Year, int? Rating, DateOnly? WatchedOn);

public sealed record LetterboxdExport(
    IReadOnlyList<LetterboxdExportFilm> Watchlist,
    IReadOnlyList<LetterboxdExportFilm> Watched);

public static class LetterboxdExportReader
{
    public const int MaxFilmsPerList = 20_000;
    private const long MaxCsvBytes = 10_000_000;
    private const long MaxBytesPerRead = 40_000_000;

    private const string WatchlistFile = "watchlist.csv";
    private const string WatchedFile = "watched.csv";
    private const string RatingsFile = "ratings.csv";
    private const string DiaryFile = "diary.csv";

    private static readonly string[] KnownFiles = [WatchlistFile, WatchedFile, RatingsFile, DiaryFile];
    private static readonly string[] IgnoredFolders = ["deleted", "orphaned", "lists", "likes"];

    public static LetterboxdExport Read(IReadOnlyList<LetterboxdExportFile> files)
    {
        var tables = new Dictionary<string, List<IReadOnlyDictionary<string, string>>>(StringComparer.Ordinal);
        var budget = new ReadBudget();
        foreach (var file in files)
        {
            foreach (var (name, text) in CsvFilesOf(file, budget))
                tables[name] = ParseTable(text);
        }

        if (tables.Count == 0)
            throw Errors.LetterboxdExportUnreadable();

        return new LetterboxdExport(
            ReadWatchlist(tables.GetValueOrDefault(WatchlistFile)),
            ReadWatched(
                tables.GetValueOrDefault(WatchedFile),
                tables.GetValueOrDefault(RatingsFile),
                tables.GetValueOrDefault(DiaryFile)));
    }

    private static IEnumerable<(string Name, string Text)> CsvFilesOf(LetterboxdExportFile file, ReadBudget budget)
    {
        if (IsZip(file.Content))
        {
            foreach (var entry in ZipEntriesOf(file.Content, budget))
                yield return entry;
            yield break;
        }

        var name = KnownNameOf(file.Name);
        if (name is not null && file.Content.LongLength <= MaxCsvBytes)
        {
            budget.Spend(file.Content.LongLength);
            yield return (name, Decode(file.Content));
        }
    }

    private static List<(string Name, string Text)> ZipEntriesOf(byte[] content, ReadBudget budget)
    {
        var entries = new List<(string Name, string Text)>();
        try
        {
            using var archive = new ZipArchive(new MemoryStream(content, writable: false), ZipArchiveMode.Read);
            foreach (var entry in archive.Entries)
            {
                var name = KnownNameOf(entry.FullName);
                if (name is null
                    || entry.Length > MaxCsvBytes
                    || InIgnoredFolder(entry.FullName)
                    || entries.Exists(read => read.Name == name))
                    continue;
                if (ReadBounded(entry) is { } bytes)
                {
                    budget.Spend(bytes.LongLength);
                    entries.Add((name, Decode(bytes)));
                }
            }
        }
        catch (InvalidDataException)
        {
            throw Errors.LetterboxdExportUnreadable();
        }

        return entries;
    }

    private static byte[]? ReadBounded(ZipArchiveEntry entry)
    {
        using var stream = entry.Open();
        using var buffer = new MemoryStream();
        var chunk = new byte[81_920];
        int read;
        while ((read = stream.Read(chunk, 0, chunk.Length)) > 0)
        {
            if (buffer.Length + read > MaxCsvBytes)
                return null;
            buffer.Write(chunk, 0, read);
        }

        return buffer.ToArray();
    }

    private static bool IsZip(byte[] content) =>
        content.Length >= 4 && content[0] == 0x50 && content[1] == 0x4B && content[2] == 0x03 && content[3] == 0x04;

    private static string? KnownNameOf(string path)
    {
        var fileName = path.Replace('\\', '/').Split('/')[^1].ToLowerInvariant();
        return Array.Find(KnownFiles, known => known == fileName);
    }

    private static bool InIgnoredFolder(string path)
    {
        var segments = path.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments[..^1].Any(segment => IgnoredFolders.Contains(segment, StringComparer.OrdinalIgnoreCase));
    }

    private static string Decode(byte[] content) => new UTF8Encoding(false).GetString(content).TrimStart('﻿');

    private static List<LetterboxdExportFilm> ReadWatchlist(List<IReadOnlyDictionary<string, string>>? rows) =>
        rows is null
            ? []
            : [.. FilmsOf(rows).Select(row => new LetterboxdExportFilm(row.Title, row.Year, null, null)).Take(MaxFilmsPerList)];

    private static List<LetterboxdExportFilm> ReadWatched(
        List<IReadOnlyDictionary<string, string>>? watched,
        List<IReadOnlyDictionary<string, string>>? ratings,
        List<IReadOnlyDictionary<string, string>>? diary)
    {
        var films = new Dictionary<(string, string), MergedFilm>();
        foreach (var row in FilmsOf(watched ?? []))
            Merge(films, row).MarkedOn ??= row.Date;
        foreach (var row in FilmsOf(ratings ?? []))
            Merge(films, row).Rating = row.Rating;
        foreach (var row in FilmsOf(diary ?? []))
        {
            var film = Merge(films, row);
            var day = row.WatchedDate ?? row.Date;
            if (day is { } watchedOn && (film.LatestViewing is null || watchedOn > film.LatestViewing))
            {
                film.LatestViewing = watchedOn;
                film.DiaryRating = row.Rating ?? film.DiaryRating;
            }
        }

        return [.. films.Values
            .Select(film => new LetterboxdExportFilm(
                film.Title,
                film.Year,
                film.Rating ?? film.DiaryRating,
                film.LatestViewing ?? film.MarkedOn))
            .Take(MaxFilmsPerList)];
    }

    private static MergedFilm Merge(Dictionary<(string, string), MergedFilm> films, ExportRow row)
    {
        var key = (row.Title.ToLowerInvariant(), row.Year);
        if (!films.TryGetValue(key, out var film))
        {
            film = new MergedFilm(row.Title, row.Year);
            films[key] = film;
        }

        return film;
    }

    private static IEnumerable<ExportRow> FilmsOf(IEnumerable<IReadOnlyDictionary<string, string>> rows)
    {
        foreach (var row in rows)
        {
            var title = row.GetValueOrDefault("name")?.Trim() ?? string.Empty;
            if (title.Length == 0)
                continue;
            yield return new ExportRow(
                title,
                row.GetValueOrDefault("year")?.Trim() ?? string.Empty,
                DayOf(row.GetValueOrDefault("date")),
                DayOf(row.GetValueOrDefault("watched date")),
                HalfStarsOf(row.GetValueOrDefault("rating")));
        }
    }

    private static DateOnly? DayOf(string? value) =>
        DateOnly.TryParseExact(value?.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            ? day
            : null;

    private static int? HalfStarsOf(string? value)
    {
        if (!double.TryParse(value?.Trim(), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var stars))
            return null;
        var halfStars = (int)Math.Round(stars * 2);
        return halfStars is >= 1 and <= 10 ? halfStars : null;
    }

    private static List<IReadOnlyDictionary<string, string>> ParseTable(string text)
    {
        var records = ParseCsv(text);
        if (records.Count == 0)
            return [];
        var header = records[0].Select(column => column.Trim().ToLowerInvariant()).ToList();
        return [.. records.Skip(1)
            .Where(record => record.Count > 1 || (record.Count == 1 && record[0].Length > 0))
            .Select(record => (IReadOnlyDictionary<string, string>)header
                .Select((column, index) => (column, value: index < record.Count ? record[index] : string.Empty))
                .GroupBy(pair => pair.column)
                .ToDictionary(group => group.Key, group => group.First().value))];
    }

    private static List<List<string>> ParseCsv(string text)
    {
        var records = new List<List<string>>();
        var record = new List<string>();
        var field = new StringBuilder();
        var quoted = false;
        var index = 0;
        while (index < text.Length)
        {
            var c = text[index];
            var escapedQuote = quoted && c == '"' && index + 1 < text.Length && text[index + 1] == '"';
            if (escapedQuote)
                field.Append('"');
            else if (c == '"')
                quoted = !quoted;
            else if (quoted || (c != ',' && c != '\n' && c != '\r'))
                field.Append(c);
            else if (c == ',')
                EndField(record, field);
            else if (c == '\n')
            {
                EndField(record, field);
                records.Add(record);
                record = [];
            }

            index += escapedQuote ? 2 : 1;
        }

        if (field.Length > 0 || record.Count > 0)
        {
            EndField(record, field);
            records.Add(record);
        }

        return records;
    }

    private static void EndField(List<string> record, StringBuilder field)
    {
        record.Add(field.ToString());
        field.Clear();
    }

    private sealed class ReadBudget
    {
        private long _spent;

        public void Spend(long bytes)
        {
            _spent += bytes;
            if (_spent > MaxBytesPerRead)
                throw Errors.LetterboxdExportUnreadable();
        }
    }

    private sealed record ExportRow(string Title, string Year, DateOnly? Date, DateOnly? WatchedDate, int? Rating);

    private sealed class MergedFilm(string title, string year)
    {
        public string Title { get; } = title;
        public string Year { get; } = year;
        public DateOnly? MarkedOn { get; set; }
        public DateOnly? LatestViewing { get; set; }
        public int? Rating { get; set; }
        public int? DiaryRating { get; set; }
    }
}
