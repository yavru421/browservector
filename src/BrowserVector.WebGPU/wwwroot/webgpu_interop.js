let gpuDevice = null;
let computePipeline = null;

export async function initWebGPU() {
    if (!navigator.gpu) {
        console.warn("WebGPU not supported on this browser.");
        return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;

    gpuDevice = await adapter.requestDevice();
    
    // Load shader code
    const shaderResponse = await fetch('_content/BrowserVector.WebGPU/Shaders/matrix_distance.wgsl');
    const shaderCode = await shaderResponse.text();

    const shaderModule = gpuDevice.createShaderModule({ code: shaderCode });

    computePipeline = gpuDevice.createComputePipeline({
        layout: 'auto',
        compute: {
            module: shaderModule,
            entryPoint: 'main',
        },
    });

    return true;
}

// Zero-Copy Batch Search Execution
export async function executeBatchSearch(wasmBufferPtr, queryPtr, dimension, vectorCount) {
    if (!gpuDevice || !computePipeline) return new Float32Array(0);

    // Read directly from WASM Heap Memory without copying
    const heapF32 = Module.HEAPF32;
    const queryData = heapF32.subarray(queryPtr / 4, (queryPtr / 4) + dimension);
    const matrixData = heapF32.subarray(wasmBufferPtr / 4, (wasmBufferPtr / 4) + (dimension * vectorCount));

    // Allocate WebGPU Buffers
    const queryBuffer = createGPUBuffer(queryData, GPUBufferUsage.STORAGE);
    const matrixBuffer = createGPUBuffer(matrixData, GPUBufferUsage.STORAGE);
    const resultsBuffer = gpuDevice.createBuffer({
        size: vectorCount * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const readbackBuffer = gpuDevice.createBuffer({
        size: vectorCount * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // Uniform Params
    const paramsArray = new Uint32Array([dimension, vectorCount]);
    const paramsBuffer = createGPUBuffer(paramsArray, GPUBufferUsage.UNIFORM);

    const bindGroup = gpuDevice.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: paramsBuffer } },
            { binding: 1, resource: { buffer: queryBuffer } },
            { binding: 2, resource: { buffer: matrixBuffer } },
            { binding: 3, resource: { buffer: resultsBuffer } },
        ]
    });

    // Dispatch Command Encoder
    const commandEncoder = gpuDevice.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(vectorCount / 64));
    passEncoder.end();

    commandEncoder.copyBufferToBuffer(resultsBuffer, 0, readbackBuffer, 0, vectorCount * 4);
    gpuDevice.queue.submit([commandEncoder.finish()]);

    // Read back results
    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const results = new Float32Array(readbackBuffer.getMappedRange().slice(0));
    readbackBuffer.unmap();

    return results;
}

function createGPUBuffer(typedArray, usage) {
    const buffer = gpuDevice.createBuffer({
        size: typedArray.byteLength,
        usage: usage | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new typedArray.constructor(buffer.getMappedRange()).set(typedArray);
    buffer.unmap();
    return buffer;
}
