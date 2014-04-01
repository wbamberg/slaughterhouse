In Firefox 31 the Add-on SDK is making a change to the execution environment for content scripts.

For most add-ons, this won't be visible. However, content scripts will no longer be able to use `unsafeWindow` or `window.wrappedJSObject` to make JavaScript objects available to content.

Instead, we've provided some new APIs that you can use to share functions and objects with content explicitly. While you're working on migrating to these new APIs, there's a mechanism you can use to switch your add-on back to the old behavior as a short-term measure.

## Who's affected? ##

Put briefly: *Add-on SDK-based add-ons that use `unsafeWindow` or `window.wrappedJSObject` in content scripts to share JavaScript objects with the scripts loaded by a web page will be broken by this change.*

By default, content scripts and the scripts loaded into web pages are insulated from each other. They can both see the DOM, but content scripts can't access objects defined by page scripts, and page scripts can't access objects defined by content scripts:

    // content-script.js
    var button = document.getElementById("show-page-script-var");
    button.addEventListener("click", function() {
      // access object defined in page script
      console.log(window.pageScriptObject.greeting);        // undefined
    }, false);
    
    window.contentScriptObject = {"greeting" : "hello from add-on"};

<!-- -->

    // page-script.js
    var button = document.getElementById("show-content-script-var");
    
    button.addEventListener("click", function() {
      // access object defined by content script
      console.log(window.contentScriptObject.greeting);     // undefined
    }, false);

    // define object to be accessed by content script
    window.pageScriptObject = {"greeting" : "hello from web page"};

Sometimes a content script wants to break through this insulation, and to do that it can use `unsafeWindow` (or `window.wrappedJSObject`, which is identical):

    // content-script.js
    var button = document.getElementById("show-page-script-var");
    button.addEventListener("click", function() {
      // access object defined in page script
      console.log(unsafeWindow.pageScriptObject.greeting);  // "hello from web page"
    }, false);
    
    unsafeWindow.contentScriptObject = {"greeting" : "hello from add-on"};

<!-- -->

    // page-script.js
    var button = document.getElementById("show-content-script-var");
    
    button.addEventListener("click", function() {
      // access object defined by content script
      console.log(window.contentScriptObject.greeting);     // "hello from add-on"
    }, false);

    window.pageScriptObject = {"greeting" : "hello from web page"};

From Firefox 31 onwards, this mechanism won't work any more to share objects from the content script to the page script:

    // content-script.js
    var button = document.getElementById("show-page-script-var");
    button.addEventListener("click", function() {
      // access object defined in page script
      console.log(unsafeWindow.pageScriptObject.greeting);  // "hello from web page"
    }, false);
    
    unsafeWindow.contentScriptObject = {"greeting" : "hello from add-on"};

<!-- -->

    // page-script.js
    var button = document.getElementById("show-content-script-var");
    
    button.addEventListener("click", function() {
      // access object defined by content script
      console.log(window.contentScriptObject.greeting);     // undefined
    }, false);

    window.pageScriptObject = {"greeting" : "hello from web page"};

Note that the use of `unsafeWindow` to access variables defined in the page script are unaffected, so this change is asymmetric. Content scripts can still access page objects using `unsafeWindow`, but not vice versa.

If the page script tries to read a variable defined using `unsafeWindow`, it will get the value `undefined`. If it tries to write to such a variable, the browser will throw an exception with this message: "Permission denied to access property [name of the property]".

## How can I fix this? ##

In the short term, there's a new option in `package.json` called "unsafe-content-script" under the "permissions" key. By setting it to `true` you can revert to the old behavior:

    "permissions": {
      "unsafe-content-script": true
    }

However, this is only a temporary fix to enable your add-on to keep working while you update to the new APIs. We will deprecate and eventually remove this flag.

The real fix is to use three new APIs to share objects and functions with web content: [`cloneInto()`](https://developer.mozilla.org/en-US/docs/Components.utils.cloneInto),
[`exportFunction()`](https://developer.mozilla.org/en-US/docs/Components.utils.exportFunction), and [`createObjectIn()`](https://developer.mozilla.org/en-US/docs/Components.utils.createObjectIn).

### cloneInto() ###

You can use `cloneInto()` to clone an object from the content script's context into the page script's content.
`cloneInto()` creates a [structured clone](#Structured_cloning) of the object in the target context, and returns a reference to the clone. You can then assign that to a property of the target window, and the page script can access it:

    // content-script.js
    contentScriptObject = {"greeting" : "hello from add-on"};
    unsafeWindow.contentScriptObject = cloneInto(contentScriptObject, unsafeWindow);

<!-- -->

    // page-script.js
    var button = document.getElementById("show-content-script-var");
    
    button.addEventListener("click", function() {
      // access object defined by content script
      console.log(window.contentScriptObject.greeting);     // "hello from add-on"
    }, false);

You can also assign the reference to an object you've created using `createObjectIn()`:

    var foo = createObjectIn(unsafeWindow, {defineAs: "foo"});
    var contentScriptObject = {"greeting" : "hello from add-on"};
    unsafeWindow.foo.contentScriptObject = cloneInto(contentScriptObject, unsafeWindow);

<!-- -->

    // page-script.js
    var button = document.getElementById("show-content-script-var");

    button.addEventListener("click", function() {
      // access object defined by content script
      console.log(window.foo.contentScriptObject.greeting); // "hello from add-on"
    }, false);

`cloneInto()` takes a boolean option `cloneFunction`: if this is present and `true`, then any functions in your object are cloned, as well.

### exportFunction() ###

You can use `exportFunction()` to expose a function from a content script to a page script. In this way a function defined in a content script can be called by the page script. Any non-native arguments, and the return value, are [cloned](#Structured_cloning) into the page script's context.

You can export the function to the target's window object:

    // content-script.js
    var salutation = "hello, ";
    function greetme(user) {
      return salutation + user;
    }

    exportFunction(greetme, unsafeWindow, {defineAs: "greetme"});

<!-- -->

    // page-script.js
    var button = document.getElementById("call-content-script-function");

    button.addEventListener("click", function() {
      console.log(window.greetme("page script"));           // "hello, page script"
    }, false);

You can also export the function to an object you've created in the page context using `createObjectIn()`. This code creates a new object in the page's context called `foo`, and attaches the `greetme()` function to that object:

    // content-script.js
    var salutation = "hello, ";
    function greetme(user) {
      return salutation + user;
    }

    var foo = createObjectIn(unsafeWindow, {defineAs: "foo"});
    exportFunction(greetme, foo, {defineAs: "greetme"});

<!-- -->

    // page-script.js
    var button = document.getElementById("call-content-script-function");

    button.addEventListener("click", function() {
      console.log(window.foo.greetme("page script"));
    }, false);

### createObjectIn() ###

You can use `createObjectIn()` to create a new object in the page script's context. You can then export objects and functions to that object, instead of the target scope's global window. See the previous sections for some examples of this.

### Structured cloning ###

These functions use the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/The_structured_clone_algorithm) to clone objects into the page context. This is more capable than JSON serialization, but still has some serious limitations. Most notably, you can't clone functions, so functions that take functions as arguments (such as callbacks) or return values can't be exported to content using `exportFunction()`. However, we're working on adding better support at least for common patterns like callbacks.

## More details ##

To learn more about the new APIs see the reference documentation:

* [`cloneInto()`](https://developer.mozilla.org/en-US/docs/Components.utils.cloneInto)
* [`exportFunction()`](https://developer.mozilla.org/en-US/docs/Components.utils.exportFunction)
* [`createObjectIn()`](https://developer.mozilla.org/en-US/docs/Components.utils.createObjectIn)

If you have any questions, ask in the [Jetpack mailing list](https://groups.google.com/forum/#!forum/mozilla-labs-jetpack) or ask Gabor: gkrizsanits@mozilla.com, gabor on irc.mozilla.org.
