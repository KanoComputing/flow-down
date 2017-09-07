# FlowDown

FlowDown is a Redux style data flow management set of mixins for Polymer 2.x+ applications.

FlowDown rides on top of Polymer's observer. It watches all the changes in an app level state and propagate the changes to the state receivers' properties, only allowing the state to flow down from the app's top level.

## Installation

`bower install --save KanoComputing/FlowDown`


## Usage

Define a top level/headless element as the `StateProvider` with a Redux style reducer. Modify the state using Polymer's `set/push/splice/etc.` methods:

```js

class MyApp extends FlownDown.StateProvider(Polymer.Element) {
    reducer (state, action) {
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
    }
}

```

You can either setup your main app element to be your state provider, or create a headless element for that.

Then for each of your elements depending on the sate:

```js

    class MyElement FlowDown.StateReceiver(Polymer.Element) {
        // In your properties, `linkState` will tell the state receiver to let the data from the link to flow into the property
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

Changing the local properties will not flow up to the state, make sure you only update the state in the reducer or you will break the 1 to 1 relation between the app state and rendered content.