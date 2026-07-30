struct MatrixParams {
    queryDimension: u32,
    vectorCount: u32,
};

@group(0) @binding(0) var<uniform> params: MatrixParams;
@group(0) @binding(1) var<storage, read> queryVector: array<f32>;
@group(0) @binding(2) var<storage, read> matrixBuffer: array<f32>;
@group(0) @binding(3) var<storage, read_write> similarityScores: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= params.vectorCount) {
        return;
    }

    let dim = params.queryDimension;
    let baseOffset = index * dim;

    var dotProduct: f32 = 0.0;
    var normQuery: f32 = 0.0;
    var normTarget: f32 = 0.0;

    for (var i: u32 = 0u; i < dim; i = i + 1u) {
        let qVal = queryVector[i];
        let tVal = matrixBuffer[baseOffset + i];

        dotProduct = dotProduct + (qVal * tVal);
        normQuery = normQuery + (qVal * qVal);
        normTarget = normTarget + (tVal * tVal);
    }

    if (normQuery > 0.0 && normTarget > 0.0) {
        similarityScores[index] = dotProduct / (sqrt(normQuery) * sqrt(normTarget));
    } else {
        similarityScores[index] = 0.0;
    }
}
