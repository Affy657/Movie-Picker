using System.Buffers;
using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class CloudRunJsonConsoleFormatter : ConsoleFormatter
{
    public const string FormatterName = "cloudrun-json";

    private readonly IOptionsMonitor<JsonConsoleFormatterOptions> _options;

    public CloudRunJsonConsoleFormatter(IOptionsMonitor<JsonConsoleFormatterOptions> options)
        : base(FormatterName)
    {
        _options = options;
    }

    public static string SeverityOf(LogLevel level) => level switch
    {
        LogLevel.Trace or LogLevel.Debug => "DEBUG",
        LogLevel.Information => "INFO",
        LogLevel.Warning => "WARNING",
        LogLevel.Error => "ERROR",
        LogLevel.Critical => "CRITICAL",
        _ => "DEFAULT"
    };

    public override void Write<TState>(
        in LogEntry<TState> logEntry,
        IExternalScopeProvider? scopeProvider,
        TextWriter textWriter)
    {
        var message = logEntry.Formatter(logEntry.State, logEntry.Exception);
        if (logEntry.Exception is null && message is null)
            return;

        var options = _options.CurrentValue;
        var buffer = new ArrayBufferWriter<byte>();
        using (var writer = new Utf8JsonWriter(buffer, options.JsonWriterOptions))
        {
            writer.WriteStartObject();
            if (options.TimestampFormat is { } timestampFormat)
                writer.WriteString("Timestamp", DateTimeOffset.UtcNow.ToString(timestampFormat, CultureInfo.InvariantCulture));
            writer.WriteString("severity", SeverityOf(logEntry.LogLevel));
            writer.WriteNumber("EventId", logEntry.EventId.Id);
            writer.WriteString("LogLevel", logEntry.LogLevel.ToString());
            writer.WriteString("Category", logEntry.Category);
            writer.WriteString("Message", message);
            if (logEntry.Exception is not null)
                writer.WriteString("Exception", logEntry.Exception.ToString());
            WriteState(writer, logEntry.State, message);
            if (options.IncludeScopes && scopeProvider is not null)
                WriteScopes(writer, scopeProvider);
            writer.WriteEndObject();
        }

        textWriter.Write(Encoding.UTF8.GetString(buffer.WrittenSpan));
        textWriter.Write(Environment.NewLine);
    }

    private static void WriteState<TState>(Utf8JsonWriter writer, TState state, string? message)
    {
        if (state is not IReadOnlyCollection<KeyValuePair<string, object?>> pairs)
            return;

        writer.WriteStartObject("State");
        writer.WriteString("Message", message);
        foreach (var pair in pairs)
            WriteItem(writer, pair);
        writer.WriteEndObject();
    }

    private static void WriteScopes(Utf8JsonWriter writer, IExternalScopeProvider scopeProvider)
    {
        writer.WriteStartArray("Scopes");
        scopeProvider.ForEachScope(
            (scope, jsonWriter) =>
            {
                if (scope is IEnumerable<KeyValuePair<string, object?>> scopePairs)
                {
                    jsonWriter.WriteStartObject();
                    jsonWriter.WriteString("Message", scope.ToString());
                    foreach (var pair in scopePairs)
                        WriteItem(jsonWriter, pair);
                    jsonWriter.WriteEndObject();
                }
                else
                {
                    jsonWriter.WriteStringValue(Convert.ToString(scope, CultureInfo.InvariantCulture));
                }
            },
            writer);
        writer.WriteEndArray();
    }

    private static void WriteItem(Utf8JsonWriter writer, KeyValuePair<string, object?> item)
    {
        switch (item.Value)
        {
            case null:
                writer.WriteNull(item.Key);
                break;
            case bool boolean:
                writer.WriteBoolean(item.Key, boolean);
                break;
            case int or long or short or byte or sbyte or uint or ulong or ushort:
                writer.WriteNumber(item.Key, Convert.ToDecimal(item.Value, CultureInfo.InvariantCulture));
                break;
            case double or float or decimal:
                writer.WriteNumber(item.Key, Convert.ToDouble(item.Value, CultureInfo.InvariantCulture));
                break;
            case DateTimeOffset dateTimeOffset:
                writer.WriteString(item.Key, dateTimeOffset.ToString("O", CultureInfo.InvariantCulture));
                break;
            case DateTime dateTime:
                writer.WriteString(item.Key, dateTime.ToString("O", CultureInfo.InvariantCulture));
                break;
            default:
                writer.WriteString(item.Key, Convert.ToString(item.Value, CultureInfo.InvariantCulture));
                break;
        }
    }
}
