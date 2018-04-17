
let storesCount = 0;
const stores = window.__flowDownStores__ || new Map();
const FlowDown = {};

window.__flowDownStores__ = stores;

function addWatcher(sId, component, property, propertyName, setValue) {
    const store = stores.get(sId);
    store.watchers.push({
        set: setValue,
        component,
        property,
        propertyName,
    });
}

function removeWatchers(sId, component) {
    const store = stores.get(sId);
    if (component) {
        store.watchers = store.watchers.filter(watcher => watcher.component !== component);
    } else {
        store.watchers = [];
    }
}

function addMutator(sId, mutator) {
    const store = stores.get(sId);
    store.mutators.push(mutator);
}

function dispatch(sId, action) {
    const store = stores.get(sId);
    if (!store.appStateComponent) {
        store.actionStack.push(action);
    } else {
        window.dispatchEvent(new CustomEvent(`action-${sId}`, { detail: action }));
    }
}

function scanProperties(sId, el, properties) {
    if (!properties) {
        return;
    }
    const store = stores.get(sId);
    Object.keys(properties).forEach((propertyName) => {
        const property = properties[propertyName];
        if (property.linkState) {
            el.set(propertyName, store.appStateComponent.get(`state.${property.linkState}`));
            const setValue = (path, value) => {
                el.set(path, value);
                el.notifyPath(path);
            };
            addWatcher(sId, el, property, propertyName, setValue);
        }
    });
}

function onAction(sId, e) {
    const action = e.detail;
    const store = stores.get(sId);
    const { appStateComponent } = store;
    store.mutators.forEach((mutator) => {
        mutator.call({
            get: appStateComponent.get.bind(appStateComponent),
            set: appStateComponent.set.bind(appStateComponent),
            push: appStateComponent.push.bind(appStateComponent),
            pop: appStateComponent.pop.bind(appStateComponent),
            splice: appStateComponent.splice.bind(appStateComponent),
            shift: appStateComponent.shift.bind(appStateComponent),
            unshift: appStateComponent.unshift.bind(appStateComponent)
        }, action);
    });
}

function stateChanged(sId, changeRecord) {
    const store = stores.get(sId);
    const { appStateComponent } = store;
    store.watchers.forEach((watcher) => {
        const statePath = `state.${watcher.property.linkState}`;
        if (changeRecord.path == statePath) {
            // Perfect match of paths
            watcher.set(watcher.propertyName, changeRecord.value);
        } else if (changeRecord.path.startsWith(statePath)) {
            if (changeRecord.path.endsWith('.splices')) {
                // Splice changes
                const cp = changeRecord.path;
                const changePath = cp.substring(0, cp.lastIndexOf('.'));
                const pathTail = changePath.replace(statePath, '');
                const propertyPath = `${watcher.propertyName}${pathTail}`;
                watcher.component.notifySplices(propertyPath, changeRecord.value.indexSplices);
            } else {
                if (watcher.property.type === Array && changeRecord.path.endsWith('.length')) {
                    // Avoid changing the lengths of arrays
                    return;
                }
                // Parent change
                watcher.set(changeRecord.path.replace(statePath, watcher.propertyName), changeRecord.value);
            }
        } else if (statePath.startsWith(changeRecord.path)) {
            // Parent node in the path was changed, update the value altogether
            watcher.set(watcher.propertyName, appStateComponent.get(statePath));
        }
    });
}

function getState(sId) {
    const { appStateComponent } = stores.get(sId);
    return appStateComponent.state;
}

function replayStackedActions(sId) {
    const store = stores.get(sId);
    store.actionStack.forEach(action => dispatch(sId, action));
}

function collect(what, which) {
    let res = {};
    while (what) {
        res = Object.assign({}, what[which], res); // Respect prototype priority
        what = Object.getPrototypeOf(what);
    }
    return res;
}

FlowDown.createStore = (initialState) => {
    const store = {
       watchers: [],
       mutators: [],
       actionStack: [],
       id: storesCount++,
    };
    const ReceiverBehavior = {
        attached() {
            scanProperties(this.getStoreId(), this, this.properties);
        },
        detached() {
            removeWatchers(this.getStoreId(), this);
        },
        getState() {
            return getState(this.getStoreId());
        },
        dispatch(action) {
            dispatch(this.getStoreId(), action);
        },
        getStoreId() {
            return store.id;
        },
    };
    const ProviderBehavior = {
        ready() {
            stores.get(this.getStoreId()).appStateComponent = this;
            window.addEventListener(`action-${this.getStoreId()}`, this._onAction.bind(this));
            replayStackedActions(this.getStoreId());
        },
        detached() {
            removeWatchers(this.getStoreId());
        },
        addMutator(mutator) {
            addMutator(this.getStoreId(), mutator);
        },
        _onAction(e) {
            onAction(this.getStoreId(), e);
        },
        properties: {
            state: {
                type: Object,
                value: () => initialState || {},
            },
        },
        observers: ['_stateChanged(state.*)'],
        getState() {
            return getState(this.getStoreId());
        },
        _stateChanged(changeRecord) {
            stateChanged(this.getStoreId(), changeRecord);
        },
        getStoreId() {
            return store.id;
        },
    };
    const receiverMixin = (parent) => {
        return class StateReceiverMixin extends parent {
            connectedCallback() {
                super.connectedCallback();
                const properties = collect(this.constructor, 'properties');
                scanProperties(this.getStoreId(), this, properties);
            }
            disconnectedCallback() {
                super.disconnectedCallback();
                removeWatchers(this.getStoreId(), this);
            }
            getState() {
                return getState(this.getStoreId());
            }
            dispatch(action) {
                dispatch(this.getStoreId(), action);
            }
            getStoreId() {
                return store.id;
            }
        };
    };
    const providerMixin = (parent) => {
        return class StateProviderBehavior extends parent {
            constructor() {
                super();
                stores.get(this.getStoreId()).appStateComponent = this;
                window.addEventListener(`action-${this.getStoreId()}`, this._onAction.bind(this));
                replayStackedActions(this.getStoreId());
            }
            disconnectedCallback() {
                super.disconnectedCallback();
                removeWatchers(this.getStoreId());
            }
            addMutator(mutator) {
                addMutator(this.getStoreId(), mutator);
            }
            _onAction(e) {
                onAction(this.getStoreId(), e);
            }
            static get properties() {
                return {
                    state: {
                        type: Object,
                        value: () => initialState || {},
                    },
                };
            }
            static get observers() {
                return ['_stateChanged(state.*)'];
            }
            getState() {
                return getState(this.getStoreId());
            }
            _stateChanged(changeRecord) {
                stateChanged(this.getStoreId(), changeRecord);
            }
            getStoreId() {
                return store.id;
            }
        };
    };
    store.StateReceiver = receiverMixin;
    store.StateProvider = providerMixin;
    store.ReceiverBehavior = ReceiverBehavior;
    store.ProviderBehavior = ProviderBehavior;
    store.addMutator = addMutator.bind(null, store.id);
    store.dispatch = dispatch.bind(null, store.id);
    store.getState = getState.bind(null, store.id);
    stores.set(store.id, store);
    return store;
};

export default FlowDown;
