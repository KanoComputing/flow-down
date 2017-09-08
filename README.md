# FlowDown

FlowDown is a Redux style data flow management set of mixins for Polymer 2.x+ applications.

FlowDown rides on top of Polymer's observer system. It watches all the changes in an app level state and propagate the changes to the state receivers' properties, only allowing the state to flow down from the app's top level.

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

### StateProvider
 - `addMutator(mutator)` same as the store's `addMutator`

### StateReceiver
 - `getState()` returns the store's state

Any element extending the StateReceiver mixin and declaring a `linkState` on their properties will have a dynamic link between the property and the state's data setup.

`linkState` expect a path to a value in the state (NOT prefixed by `state`)