
var someLocalVariable = {name: "selection1", node: document.documentElement};

function bar() {
}

var someLocalVariableContainingAFunction = {name: "selection1", foo : bar};

var button3 = document.getElementById("button3");
button3.addEventListener("click", function() {
  var value = foo2.bar2;
  console.log(value);
}, false);

var button4 = document.getElementById("button4");
button4.addEventListener("click", function() {
  var value = foo3("alice");
  console.log(value);
}, false);

var button5 = document.getElementById("button5");
button5.addEventListener("click", function() {
  var value = greeter.greetme("bob");
  console.log(value);
}, false);

var button6 = document.getElementById("button6");
button6.addEventListener("click", function() {
  // modifications made in content script are reflected back here
  console.log(someLocalVariable);
}, false);
