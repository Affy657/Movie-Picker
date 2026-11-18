using System.Reflection;
using System.Text.RegularExpressions;
using MoviePicker.Api.Application;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed partial class ServerCopyTests
{
    private const string TitlePlaceholder = "Dune";

    [GeneratedRegex(@"(^|[\s«(])(tu|Tu|toi|Toi|Ton|tes|Rejoins|Rejoins-la|Connecte-toi|Indique|Demande)(?=[\s.,!?'’»)]|$)")]
    private static partial Regex Tutoiement();

    public static TheoryData<string, string> FrenchTexts()
    {
        var data = new TheoryData<string, string>();
        foreach (var (member, text) in FrenchCopy())
            data.Add(member, text);
        return data;
    }

    [Theory]
    [MemberData(nameof(FrenchTexts))]
    public void FrenchText_AddressesTheReaderWithVous(string member, string text) =>
        Assert.False(Tutoiement().IsMatch(text), $"{member} uses the familiar form: {text}");

    [Theory]
    [InlineData("Tu as reçu une invitation pour une soirée ciné sur Movie Picker. Ouvre le lien pour la rejoindre.")]
    [InlineData("Soirée ciné le samedi 21 novembre. Rejoins la soirée et vote pour ton film.")]
    [InlineData("Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe restera inchangé.")]
    public void TutoiementPattern_CatchesTheFamiliarTextTheServerUsedToSend(string formerText) =>
        Assert.Matches(Tutoiement(), formerText);

    [Fact]
    public void FrenchCopy_ReadsEveryGroupButTheEnglishEmail()
    {
        var groups = FrenchCopy().Select(entry => entry.Member.Split('.')[0]).Distinct().Order().ToList();

        Assert.Equal(["PasswordResetEmail", "Push", "SharePreviews"], groups);
    }

    private static IEnumerable<(string Member, string Text)> FrenchCopy() =>
        typeof(ServerCopy).GetNestedTypes()
            .Where(group => group != typeof(ServerCopy.English))
            .SelectMany(TextsOf);

    private static IEnumerable<(string Member, string Text)> TextsOf(Type group)
    {
        foreach (var field in group.GetFields(BindingFlags.Public | BindingFlags.Static))
            yield return ($"{group.Name}.{field.Name}", (string)field.GetValue(null)!);

        foreach (var method in group.GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly))
        {
            foreach (var withShortValues in new[] { true, false })
            {
                var arguments = method.GetParameters().Select(parameter => Placeholder(parameter, withShortValues)).ToArray();
                foreach (var text in Flatten(method.Invoke(null, arguments)))
                    yield return ($"{group.Name}.{method.Name}", text);
            }
        }
    }

    private static object? Placeholder(ParameterInfo parameter, bool withShortValues)
    {
        if (parameter.ParameterType == typeof(int))
            return withShortValues ? 1 : 2;
        var nullable = new NullabilityInfoContext().Create(parameter).WriteState == NullabilityState.Nullable;
        return nullable && withShortValues ? null : TitlePlaceholder;
    }

    private static IEnumerable<string> Flatten(object? copy) => copy switch
    {
        string text => [text],
        PushText push => [push.Title, push.Body],
        _ => throw new InvalidOperationException($"ServerCopy returned an unexpected {copy?.GetType().Name ?? "null"}")
    };
}
