using System.Numerics;
using System.Runtime.Intrinsics;
using System.Runtime.Intrinsics.X86;

namespace BrowserVector.Core.Math;

public static class SimdVectorMath
{
    public static float CosineSimilarity(ReadOnlySpan<float> vecA, ReadOnlySpan<float> vecB)
    {
        if (vecA.Length != vecB.Length)
            throw new ArgumentException("Vector dimensions must match.");

        float dot = DotProductSIMD(vecA, vecB);
        float normA = DotProductSIMD(vecA, vecA);
        float normB = DotProductSIMD(vecB, vecB);

        if (normA == 0f || normB == 0f) return 0f;

        return dot / (MathF.Sqrt(normA) * MathF.Sqrt(normB));
    }

    public static float DotProductSIMD(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        int length = a.Length;
        int simdBits = Vector<float>.Count;
        int i = 0;
        float sum = 0f;

        if (Vector.IsHardwareAccelerated && length >= simdBits)
        {
            Vector<float> vSum = Vector<float>.Zero;
            int limit = length - simdBits;

            for (; i <= limit; i += simdBits)
            {
                var va = new Vector<float>(a.Slice(i, simdBits));
                var vb = new Vector<float>(b.Slice(i, simdBits));
                vSum += va * vb;
            }

            sum = Vector.Dot(vSum, Vector<float>.One);
        }

        // Remainder loop
        for (; i < length; i++)
        {
            sum += a[i] * b[i];
        }

        return sum;
    }
}
