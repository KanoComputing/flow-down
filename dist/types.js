(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.FlowDown = global.FlowDown || {}, global.FlowDown.types = factory());
}(this, (function () { 'use strict';

function types(constants) {
    return Object.freeze(constants.reduce((acc, constant) => {
        acc[constant] = Symbol(constant);
        return acc;
    }, {}));
}

return types;

})));
