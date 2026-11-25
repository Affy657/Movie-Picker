using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using MoviePicker.Api.Application;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class ServerCopyTests
{
    private const string TitlePlaceholder = "Dune";

    private static readonly (string Form, Regex Pattern)[] FamiliarForms = LoadFamiliarForms();

    public static TheoryData<string, string> FrenchTexts()
    {
        var data = new TheoryData<string, string>();
        foreach (var (member, text) in FrenchCopy())
            data.Add(member, text);
        return data;
    }

    [Theory]
    [MemberData(nameof(FrenchTexts))]
    public void FrenchText_AddressesTheReaderWithVous(string member, string text)
    {
        var forms = FamiliarFormsIn(text);

        Assert.True(forms.Length == 0, $"{member} uses the familiar form ({string.Join(", ", forms)}): {text}");
    }

    [Theory]
    [InlineData("Tu as reçu une invitation pour une soirée ciné sur Movie Picker. Ouvre le lien pour la rejoindre.")]
    [InlineData("Soirée ciné le samedi 21 novembre. Rejoins la soirée et vote pour ton film.")]
    [InlineData("Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe restera inchangé.")]
    [InlineData("Pense à vérifier les spams. Demande-en un nouveau.")]
    public void FamiliarForms_CatchTheFamiliarTextTheServerUsedToSend(string formerText) =>
        Assert.NotEmpty(FamiliarFormsIn(formerText));

    [Theory]
    [InlineData("Demain, c'est Dune ! Prépare le canapé et le popcorn 🍿")]
    [InlineData("Dune, vu pendant Dune : note le film !")]
    [InlineData("Choisis le film ensemble : chacun propose, tout le monde vote.")]
    [InlineData("Réessaie dans quelques instants.")]
    [InlineData("Envoie le lien au groupe.")]
    public void FamiliarForms_CatchAnImperativeTheyWereNeverGiven(string familiarText) =>
        Assert.NotEmpty(FamiliarFormsIn(familiarText));

    [Fact]
    public void FrenchCopy_ReadsEveryGroupButTheEnglishEmail()
    {
        var groups = FrenchCopy().Select(entry => entry.Member.Split('.')[0]).Distinct().Order().ToList();

        Assert.Equal(["DeletedAccount", "IdeaIssue", "PasswordResetEmail", "PhotoReportEmail", "Push", "SharePreviews"], groups);
    }

    private static (string Form, Regex Pattern)[] LoadFamiliarForms()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Application", "familiar-french.json");
        var fragmentsByForm = JsonSerializer.Deserialize<Dictionary<string, string[]>>(File.ReadAllText(path))!;
        return fragmentsByForm
            .Select(entry => (entry.Key, new Regex(string.Concat(entry.Value), RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1))))
            .ToArray();
    }

    private static string[] FamiliarFormsIn(string text) =>
        FamiliarForms.Where(familiar => familiar.Pattern.IsMatch(text)).Select(familiar => familiar.Form).ToArray();

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
