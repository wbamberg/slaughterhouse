
This guide describes three functions which a more-privileged JavaScript context can use to expose code to a less-privileged context. For example, they could be used by an add-on's code to share objects and functions with a script running in a normal web page.

The three functions are:

  `evalInWindow(script, targetWindow)`: from privileged code, safely access variables and APIs defined in less-privileged code
  `exportFunction(function, targetScope, options)`: export a function into the less-privileged context, and allow it to be called there
  `createObjectIn(targetScope, options)`: create a named object in the less-privileged context, and allow it to be accessed there

## `evalInWindow` ##

This function enables you to evaluate a string in a less-privileged JavaScript context. The result is [structure-cloned](/en-US/docs/Web/Guide/API/DOM/The_structured_clone_algorithm) back to the original context, unless it is native (for example, if it returns a DOM node, this is not structure-cloned, because the original context will see that through an XRayWrapper already).

This is useful for privileged code, such as add-on code, to access variables defined in web content or to access APIs defined in web content.

### Syntax ###

    var result = Components.utils.evalInWindow(script, window)

### Parameters ###

**script : string**

The script to evaluate in the other window.

**window : object**

The window in which to evaluate the script.

### Returns ###

The result of evaluating the script. If this is just native (for example, a DOM node), then the function relies on XRayWrappers to wrap the returned content, otherwise the result is structure-cloned. This does impose some restrictions on the sorts of things that can be returned: in particular, the result can't contain any functions.

### Example ###

If a page script defines a local variable:

[page-script.js]
    var someLocalVariable = {name: "selection1", node: document.documentElement};

An add-on script or other privileged script can access the variable. Add-on SDK [content scripts]() get evalInWindow automatically added to their scope, and can access the content window using `window.wrappedJSObject`:

[content-script.js]
    var result = evalInWindow("someLocalVariable", window.wrappedJSObject);
    console.log(result);
    // {"name":"selection1","node":{}}

The add-on code can modify the variable as well, of course:

[content-script.js]
    evalInWindow("someLocalVariable.newProp = 42", window.wrappedJSObject);

[page-script.js]
    console.log(window.someLocalVariable.newProp);
    // 42

But note that the content script must trust that the page script has not redefined the setter on `someLocalVariable`: unlike XRayWrappers, evalInWindow does not provide x-ray vision.

If the returned object contains a function, calls to `evalInWindow` will throw an error:

[page-script.js]
    function bar() {
    }

    var someLocalVariableContainingAFunction = {name: "selection1", foo : bar};

[content-script.js]
    evalInWindow("someLocalVariable", window.wrappedJSObject);
    // ERROR, function can't be cloned

## `exportFunction` ##

This function provides a safe way to expose a function from a privileged scope to a less-privileged scope. In this way privileged code, such as an add-on, can share code with less-privileged code like a normal web page script.

A function exported from privileged to less-privileged code can be called from the less privileged code's context. Any arguments are structure-cloned across the boundary unless they are native objects such as DOM nodes. The function has access to its surrounding closure just as if it were being called in the privileged context. Any return value is structure-cloned back to the less-privileged calling context.

The function does not have to be added to the less privileged code's global window object. The privileged code can use [`createObjectIn`]() to create a new object in the other side, then export the function to that object.

### Syntax ###

    exportFunction(func, targetScope, options)

### Parameters ###

**func : function**

The function to export. I'm guessing this function can't take functions as arguments?

**targetScope: object**

The object to attach the function to. This does not have to be the global window object: it could be an object returned by [createObjectIn]().

**options: object**

Options. One option is currently defined, `defineAs`, which determines the name of the function in the targetScope.

### Returns ###

Not sure.

### Example ###

If a content script defines a function:

    var salutation = "hello ";

    function greetme(user) {
      return salutation + user;
    }

It can export the function to the content window like this:

    exportFunction(greetme, unsafeWindow, {defineAs: "foo"});

Code running in the content window's scope can now call the function:

    var greeting = foo("alice");
    console.log(greeting);
    // "hello alice"

Instead of adding the function to the global object, the content script can add it to an object it's created using `createObjectIn`:

    var greeter = createObjectIn(unsafeWindow, {defineAs: "greeter"});
    exportFunction(greetme, greeter, {defineAs: "greetme"});

Now the content window has a new object `greeter`:

    var greeting = greeter.greetme("bob");
    console.log(greeting);
