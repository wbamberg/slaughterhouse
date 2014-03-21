var button1 = document.getElementById("button1");
button1.addEventListener("click", function() {
  var value = foo1.bar1;
  console.log(value);
}, false);

var button2 = document.getElementById("button2");
button2.addEventListener("click", function() {
  var value = foo2.bar2;
  console.log(value);
}, false);

var button3 = document.getElementById("button3");
button3.addEventListener("click", function() {
  var value = foo3("alice");
  console.log(value);
}, false);

var button4 = document.getElementById("button4");
button4.addEventListener("click", function() {
  var value = foo4.greetme("bob");
  console.log(value);
}, false);