export default [{
    input: 'flow-down.js',
    output: {
        file: 'dist/flow-down.js',
        format: 'umd',
        name: 'FlowDown',
    },
}, {
    input: 'plugin/array-selector.js',
    output: {
        file: 'dist/plugin/array-selector.js',
        format: 'umd',
        name: 'FlowDown.ArraySelector',
    },
}, {
    input: 'lib/types.js',
    output: {
        file: 'dist/types.js',
        format: 'umd',
        name: 'FlowDown.types',
    },
}];
