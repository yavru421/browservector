using System.Text;

namespace BrowserVector.Core.Storage;

public class OpfsStorage
{
    public static async Task SaveIndexAsync(string fileName, byte[] data)
    {
        // Interop layer to JS FileSystemFileHandle stream write
        // Operates non-blocking on the main UI thread
        await Task.CompletedTask; 
    }

    public static async Task<byte[]?> LoadIndexAsync(string fileName)
    {
        // Interop layer to JS FileSystemFileHandle read stream
        await Task.CompletedTask;
        return null;
    }
}
