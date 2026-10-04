using System.Collections.Concurrent;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class CompareAndSwapExtensionsTests
{
    private readonly ConcurrentDictionary<string, string> _store = new() { ["key"] = "read" };

    [Fact]
    public void SwapIfPresent_StoresAndReturnsTheChangedValue()
    {
        var stored = _store.SwapIfPresent("key", current => current + "+changed");

        Assert.Equal("read+changed", stored);
        Assert.Equal("read+changed", _store["key"]);
    }

    [Fact]
    public void SwapIfPresent_AfterAConcurrentWrite_ReappliesTheChangeOnTheNewerValue()
    {
        var seen = new List<string>();

        var stored = _store.SwapIfPresent("key", current =>
        {
            seen.Add(current);
            if (seen.Count == 1)
                _store["key"] = "written meanwhile";
            return current + "+changed";
        });

        Assert.Equal(["read", "written meanwhile"], seen);
        Assert.Equal("written meanwhile+changed", stored);
        Assert.Equal("written meanwhile+changed", _store["key"]);
    }

    [Fact]
    public void SwapIfPresent_AfterAConcurrentRemoval_GivesUpWithoutBringingTheEntryBack()
    {
        var stored = _store.SwapIfPresent("key", current =>
        {
            _store.TryRemove("key", out _);
            return current + "+changed";
        });

        Assert.Null(stored);
        Assert.False(_store.ContainsKey("key"));
    }

    [Fact]
    public void SwapIfPresent_WhenTheChangeDeclines_LeavesTheValueAsItIs()
    {
        var stored = _store.SwapIfPresent("key", _ => null);

        Assert.Null(stored);
        Assert.Equal("read", _store["key"]);
    }

    [Fact]
    public void SwapIfPresent_OnAMissingKey_NeitherChangesNorAddsAnything()
    {
        var changed = false;

        var stored = _store.SwapIfPresent("missing", current =>
        {
            changed = true;
            return current;
        });

        Assert.Null(stored);
        Assert.False(changed);
        Assert.False(_store.ContainsKey("missing"));
    }
}
