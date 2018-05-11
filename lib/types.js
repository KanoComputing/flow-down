function types(constants) {
    return Object.freeze(constants.reduce((acc, constant) => {
        acc[constant] = Symbol(constant);
        return acc;
    }, {}));
}

export default types;
