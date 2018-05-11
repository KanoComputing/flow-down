# FlowDown

FlowDown is a Redux style data flow management set of mixins and behaviors for Polymer 1.x/2.x applications.

FlowDown rides on top of Polymer's observer system. It watches all the changes in an app level state and propagate the changes to the state receivers' properties, only allowing the state to flow down from the app's top level.

Examples

[Clock](https://kanocomputing.github.io/flow-down/examples/clock/)
[Todo](https://kanocomputing.github.io/flow-down/examples/todo/)

## Installation

`bower install --save KanoComputing/flow-down`


## Usage

Create a new store

```js

MyApp.Store = FlowDown.createStore({ /* Optional initial state */
    data: 7
});

// These two mixins are now available to use.
// Keep a reference to use them with your components
MyApp.Store.StateProvider;
MyApp.Store.StateReceiver;

// The store exposes the `addMutator` method
// Mutators will be executed in the order they were added
MyApp.Store.addMutator(action => {
    switch (action.type) {
        case 'SOMETHING':
            // Mutate the data;
            break;
    }
});

```

Define a top level/headless element as the `StateProvider`.

The method is called mutator because it doesn't act as a reducer, but mutates the data.
Although this is against one of the rules of Redux, as it's powered by Polymer's observers, and the data
cannot flow back up, the integrity of the state is conserved.

Modify the state using Polymer's `set/push/splice/etc.` methods:

```js

class MyApp extends MyApp.Store.StateProvider(Polymer.Element) {
    constructor () {
        super();
        // You can add mutators in the state provider as well
        this.addMutator(action => {
            switch (action.type) {
                case 'ITEM_RETRIEVED':
                    // Set all the items
                    this.set('state.items', action.data);
                    break;
                case 'ADD_ITEM':
                    // Add an item
                    this.push('state.items', action.data);
                    break;
                case 'SELECT_ITEM':
                    // Select an item
                    this.set('state.selectedItem', this.state.items[action.data]);
                    break;
            }
        });
    }
}

```

You can either setup your main app element to be your state provider, or create a headless element for that.

Then for each of your elements depending on the sate:

```js

    class MyElement extends MyApp.Store.StateReceiver(Polymer.Element) {
        // In your properties, `linkState` will tell the
        // state receiver to let the data from the link to flow into the property
        static get properties() {
            return {
                item: {
                    type: Object,
                    linkState: 'selectedItem'
                },
                items: {
                    type: Array,
                    linkState: 'items'
                }
            }
        }
        _selectItem (e) {
            const index = e.model.get('index');
            // Dispatch your actions like you would using redux
            this.dispatch({ type: 'SELECT_ITEM', data: index });
        }
        _addItem () {
            this.dispatch({ type: 'ADD_ITEM', data: this.$.input.value });
        }
    }
```

## Common Practice

Changing the local properties will not flow up to the state, make sure you only update the state in the mutator or you will break the 1 to 1 relation between the app state and rendered content.

## API

### window.FlowDown

 - `createStore(initialState)`
    Creates and returns a new `FlowDownStore`. `initialState` is optional and will default to `{}`

### FlownDownStore
 - `addMutator(mutator)`
    Adds a mutator to the store. Mutators will be executed in the order they were added to the store. A mutator signature must be `(action) => {}`. The scope of the mutator will contain a set of methods to mutate the state, which come from Polymer's property effects methods
    - get
    - set
    - push
    - pop
    - splice
    - shift
    - unshift
 - `dispatch(action)`
    Dispatches an action to the store

When using these methods, you will need to specify `state` as the root variable of the path.

Won't work:
```js
this.set('todos.0.done', true);
```
Will work
```js
this.set('state.todos.0.done', true);
```

 - `StateProvider`: The state provider mixin
 - `StateReceiver`: The state receiver mixin
 - `ProviderBehavior`: The state provider behavior
 - `ReceiverBehavior`: The state receiver behavior

### StateProvider
 - `addMutator(mutator)` same as the store's `addMutator`

### StateReceiver
 - `getState()` returns the store's state
 - `dispatch(action)` Dispatches an action to the store

Any element extending the StateReceiver mixin and declaring a `linkState` on their properties will have a dynamic link between the property and the state's data setup.

`linkState` expect a path to a value in the state (NOT prefixed by `state`)

## Utils

### types

The type property in actions should be unique, but when creating multiple mutators in different files, using a string can end up in duplicate types. The types util takes an array of string as an input and returns an object with the array's items as keys pointing to a symbol, ensuring its uniqueness:

```js
import types from './node_modules/flow-down/lib/types.js';

const TYPES = types(['SELECT', 'INCREMENT', 'ADD']);

// Now you can use your types in your mutator and dispatches
function mutator(action) {
    switch (action.type) {
    case TYPES.SELECT: {
        // Do something
        break;
    }
    case TYPES.INCREMENT: {
        // Do something
        break;
    }
    case TYPES.ADD: {
        // Do something
        break;
    }
    default: {
        break;
    }
    }
}

// Use to dispatch
store.dispatch({ type: TYPES.SELECT });
```

## Plugins

### ArraySelector

You can use the ArraySelectorPlugin to allow your receivers to have a property holding an item from an array in the state, pointed by an index.

To use it, just give the store to the plugin, then use `linkArray` and `linkIndex` in your receiver to configure the selected item property:

```js
import FlowDown from './node_modules/flow-down/flow-down.js';
import ArraySelector from './node_modules/flow-down/plugin/array-selector.js';

// Creat store with array and index
const store = FlowDown.create({
    items: [1, 2, 3, 4, 5, 6, 7],
    selectedItemIndex: 3,
});

// Enable the plugin
ArraySelector(store);

// Create receiver element
class MyEl extends store.StateReceiver(Polymer.Element) {
    static get properties() {
        return {
            // Link the array
            items: {
                linkState: 'items',
            },
            // Link the index
            index: {
                linkState: 'selectedItemIndex',
            },
            // Configure the item property
            item: {
                linkArray: 'items',
                linkIndex: 'index',
            },
        }
    }
}

```

By updateing the state through mutations, the item property will update accordingly, but will but be stored in the state as it is duplicate data.
