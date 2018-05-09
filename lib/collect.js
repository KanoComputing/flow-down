function collect(whatArg, which) {
    let res = {};
    let what = whatArg;
    while (what) {
        res = Object.assign({}, what[which], res); // Respect prototype priority
        what = Object.getPrototypeOf(what);
    }
    return res;
}

export default collect;
