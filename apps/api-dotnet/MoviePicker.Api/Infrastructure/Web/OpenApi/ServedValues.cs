using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

internal static partial class ServedValues
{
    public static string[] LowerCaseNames<TEnum>() where TEnum : struct, Enum =>
        Enum.GetValues<TEnum>().Select(value => value.ToString().ToLowerInvariant()).ToArray();

    public static string[] StringConstantsOf(Type holder) =>
        holder.GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.IsLiteral && field.FieldType == typeof(string))
            .Select(field => (string)field.GetRawConstantValue()!)
            .ToArray();

    public static string[]? ClosedListOf(ICustomAttributeProvider member)
    {
        var pattern = member.GetCustomAttributes(typeof(RegularExpressionAttribute), inherit: true)
            .OfType<RegularExpressionAttribute>()
            .FirstOrDefault()?.Pattern;
        if (pattern is null || ClosedListPattern().Match(pattern) is not { Success: true } match)
            return null;

        var prefix = match.Groups["prefix"].Value;
        var suffix = match.Groups["suffix"].Value;
        return match.Groups["values"].Value.Split('|').Select(value => prefix + value + suffix).ToArray();
    }

    public static List<JsonNode> AsEnum(IEnumerable<string> values) =>
        values.Select(value => (JsonNode)JsonValue.Create(value)).ToList();

    [GeneratedRegex(@"^\^(?<prefix>[A-Za-z0-9/_-]*)\((?<values>[A-Za-z0-9_-]+(?:\|[A-Za-z0-9_-]+)*)\)(?<suffix>[A-Za-z0-9/_-]*)\$$")]
    private static partial Regex ClosedListPattern();
}
