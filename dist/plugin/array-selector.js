(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.FlowDown = global.FlowDown || {}, global.FlowDown.ArraySelector = factory());
}(this, (function () { 'use strict';

function collect(whatArg, which) {
    let res = {};
    let what = whatArg;
    while (what) {
        res = Object.assign({}, what[which], res); // Respect prototype priority
        what = Object.getPrototypeOf(what);
    }
    return res;
}

const arraySelectorPlugin = (store) => {
    const { StateReceiver } = store;

    const PluginMixin = base => class PluginClass extends StateReceiver(base) {
        ready() {
            super.ready();
            const properties = collect(this.constructor, 'properties');
            if (!properties) {
                return;
            }
            Object.keys(properties).forEach((propertyName) => {
                const property = properties[propertyName];
                if (property.linkArray && property.linkIndex) {
                    const indexLink = `state.${properties[property.linkIndex].linkState}`;
                    this._setupArraySelection(
                        property.linkArray,
                        property.linkIndex,
                        propertyName,
                        indexLink,
                    );
                }
            });
        }
        _setupArraySelection(itemsProp, indexProp, itemProp, indexLink) {
            const indexChangedName = `__indexChanged__${indexProp}`;
            const itemsChangedName = `__itemsChanged__${itemsProp}`;
            const itemsExpression = `${itemsChangedName}(${itemsProp}.*)`;

            this[indexChangedName] = (value) => {
                if (typeof value === 'undefined') {
                    return;
                }
                this.set(itemProp, this[itemsProp][value]);
            };
            this[itemsChangedName] = (info) => {
                const { path } = info;
                if (path === itemsProp) {
                    this[indexChangedName](this[indexProp]);
                } else if (path === `${itemsProp}.splices`) {
                    this._applySplices(indexProp, indexLink, info.value.indexSplices);
                } else {
                    const subPath = path.replace(`${itemsProp}.`, '');
                    const parts = subPath.split('.');
                    const idx = parts.shift();
                    const indexValue = this[indexProp];
                    if (typeof indexValue === 'undefined' || indexValue === null) {
                        return;
                    }
                    // Compare indexes as key to support both hashs and arrays
                    if (idx === indexValue.toString()) {
                        if (parts.length) {
                            this.notifyPath(`${itemProp}.${parts.join('.')}`);
                        } else {
                            this[indexChangedName](this[indexProp]);
                        }
                    }
                }
            };

            this._createPropertyObserver(indexProp, indexChangedName);
            this._createMethodObserver(itemsExpression);
        }
        _applySplices(indexProp, indexLink, splices) {
            let idx;
            if (!store.appStateComponent) {
                return;
            }
            // Adjust selected indices and mark removals
            for (let i = 0; i < splices.length; i += 1) {
                const s = splices[i];
                idx = this[indexProp];
                if (idx < s.index) {
                    // no change
                } else if (idx >= s.index + s.removed.length) {
                    // adjust index
                    store.appStateComponent.set(indexLink, idx + (s.addedCount - s.removed.length));
                } else {
                    // remove index
                    store.appStateComponent.set(indexLink, -1);
                }
                for (let j = 0; j < s.addedCount; j += 1) {
                    const addedIdx = s.index + j;
                    if (idx > addedIdx) {
                        store.appStateComponent.set(indexLink, idx + 1);
                    }
                }
            }
        }
    };

    store.StateReceiver = PluginMixin;

    return {};
};

return arraySelectorPlugin;

})));
