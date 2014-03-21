
// just attaching an object to unsafeWindow won't work,
// because the content script doesn't have the permissions
// to access it
unsafeWindow.foo1 = {"bar1":"baz1"};

// you can run a script in the content window using evalInWindow
evalInWindow('foo2 = {"bar2":"baz2"}', unsafeWindow);

function greetme(user) {
  return "hello " + user;
}

// you can export a function to the content window using exportFunction
// the content window will be able to call it using the name you
// supplied to `defineAs`
exportFunction(greetme, unsafeWindow, {defineAs: "foo3"});

// you can create a named object in the content window
var greeter = createObjectIn(unsafeWindow, {defineAs: "foo4"});
// you can then attach functions to the object by passing
// them as the target in exportFunction
exportFunction(greetme, greeter, {defineAs: "greetme"});
