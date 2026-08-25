using MoviePicker.Api.Infrastructure;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class EnvLoaderTests : IDisposable
{
    private readonly List<string> _keysToClear = [];
    private readonly List<string> _dirsToDelete = [];

    private string UniqueKey()
    {
        var key = "MP_ENVLOADER_TEST_" + Guid.NewGuid().ToString("N");
        _keysToClear.Add(key);
        return key;
    }

    private string NewTempDir()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mp-envloader-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        _dirsToDelete.Add(dir);
        return dir;
    }

    public void Dispose()
    {
        foreach (var key in _keysToClear)
            Environment.SetEnvironmentVariable(key, null);
        foreach (var dir in _dirsToDelete)
        {
            if (Directory.Exists(dir))
                Directory.Delete(dir, recursive: true);
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("# a comment")]
    [InlineData("   # indented comment")]
    [InlineData("no-equals-sign")]
    [InlineData("=missingKey")]
    public void TryParseEnvLine_InvalidLines_ReturnFalse(string line)
    {
        Assert.False(EnvLoader.TryParseEnvLine(line, out _, out _));
    }

    [Theory]
    [InlineData("KEY=value", "KEY", "value")]
    [InlineData("  KEY  =  value  ", "KEY", "value")]
    [InlineData("TOKEN=a=b=c", "TOKEN", "a=b=c")]
    [InlineData("EMPTY=", "EMPTY", "")]
    public void TryParseEnvLine_ValidLines_ParseKeyAndValue(string line, string expectedKey, string expectedValue)
    {
        Assert.True(EnvLoader.TryParseEnvLine(line, out var key, out var value));
        Assert.Equal(expectedKey, key);
        Assert.Equal(expectedValue, value);
    }

    [Theory]
    [InlineData("Q=\"hello world\"", "hello world")]
    [InlineData("Q=\"\"", "")]
    [InlineData("Q=x", "x")]
    [InlineData("Q=\"a\\\"b\"", "a\"b")]
    public void TryParseEnvLine_StripsSurroundingQuotes(string line, string expectedValue)
    {
        Assert.True(EnvLoader.TryParseEnvLine(line, out _, out var value));
        Assert.Equal(expectedValue, value);
    }

    [Fact]
    public void LoadFromEnvFileIfExists_AppliesVariablesFromEnvFile()
    {
        var dir = NewTempDir();
        var key = UniqueKey();
        File.WriteAllText(Path.Combine(dir, ".env"), $"# comment\n\n{key}=from-file\n");

        EnvLoader.LoadFromEnvFileIfExists(dir);

        Assert.Equal("from-file", Environment.GetEnvironmentVariable(key));
    }

    [Fact]
    public void LoadFromEnvFileIfExists_WalksUpToParentDirectories()
    {
        var parent = NewTempDir();
        var child = Path.Combine(parent, "a", "b");
        Directory.CreateDirectory(child);
        var key = UniqueKey();
        File.WriteAllText(Path.Combine(parent, ".env"), $"{key}=parent-value\n");

        EnvLoader.LoadFromEnvFileIfExists(child);

        Assert.Equal("parent-value", Environment.GetEnvironmentVariable(key));
    }

    [Fact]
    public void LoadFromEnvFileIfExists_MergesParentEnvAfterNestedEnv()
    {
        var parent = NewTempDir();
        var child = Path.Combine(parent, "api");
        Directory.CreateDirectory(child);
        var nestedKey = UniqueKey();
        var parentKey = UniqueKey();
        File.WriteAllText(Path.Combine(child, ".env"), $"{nestedKey}=nested-only\n");
        File.WriteAllText(Path.Combine(parent, ".env"), $"{parentKey}=from-root\n");

        EnvLoader.LoadFromEnvFileIfExists(child);

        Assert.Equal("nested-only", Environment.GetEnvironmentVariable(nestedKey));
        Assert.Equal("from-root", Environment.GetEnvironmentVariable(parentKey));
    }

    [Fact]
    public void LoadFromEnvFileIfExists_CloserEnvWinsOverParentForSameKey()
    {
        var parent = NewTempDir();
        var child = Path.Combine(parent, "api");
        Directory.CreateDirectory(child);
        var key = UniqueKey();
        File.WriteAllText(Path.Combine(child, ".env"), $"{key}=nested\n");
        File.WriteAllText(Path.Combine(parent, ".env"), $"{key}=from-root\n");

        EnvLoader.LoadFromEnvFileIfExists(child);

        Assert.Equal("nested", Environment.GetEnvironmentVariable(key));
    }

    [Fact]
    public void LoadFromEnvFileIfExists_DoesNotOverrideExistingVariable()
    {
        var dir = NewTempDir();
        var key = UniqueKey();
        Environment.SetEnvironmentVariable(key, "original");
        File.WriteAllText(Path.Combine(dir, ".env"), $"{key}=from-file\n");

        EnvLoader.LoadFromEnvFileIfExists(dir);

        Assert.Equal("original", Environment.GetEnvironmentVariable(key));
    }

    [Fact]
    public void LoadFromEnvFileIfExists_NoEnvFile_DoesNothing()
    {
        var dir = NewTempDir();
        var key = UniqueKey();

        EnvLoader.LoadFromEnvFileIfExists(dir);

        Assert.Null(Environment.GetEnvironmentVariable(key));
    }
}
