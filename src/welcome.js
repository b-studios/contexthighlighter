/**
 * Contexthighlighter
 * ==================
 * Welcome to the new syntax highlighting experience. If you ever mistyped a variable's name
 * or got the scope of a variable wrong - contexthighlighter will be your friend.
 *
 * So let's start and give it a try.
 */

// Global variables are not colored in a special wat, but they are underlined to give a small 
// visual cue.
var div = document.createElement('div');

// As you can see the usual syntax highlighting is monochrome, so that colors are available for
// a special purpose: They indicate scope!
function forAllSpans(className, fun) {
  
  // The variables bound in the scope of `forAllSpans` are all colored yellow.
  // Try renaming a variable declaration (like `var spans` to `var span` and
  // observe how all bound instances change their color to "global".
  var spans = document.querySelectorAll('span.' + className),
      i;
  
  for (i = 0; i < spans.length; i++) {
    fun.call(spans[i], i, spans[i]);
  }
}

// Of course nested scopes are also supported
function markIdentifier(markedClass) {

  // The function expression which is passed as an argument to `forAllSpans` is
  // colored in red. If you click (or navigate) inside of the name of a variable
  // (like `classes`) you can see a short highlight of all occurences of this
  // variable.
  forAllSpans('id', function (i, el) {
    var classes = el.className.split(' ');
    
    if (classes.indexOf(markedClass) === -1) {
      classes.push(markedClass);
    }
    el.className = classes.join(' ');
  });
}

// Let's nest functions even deeper
var highlighter = (function (global) {
  
  return {
    log: function (className) {
      forAllSpans(className, function (i, el) {
        console.log(el); 
      });
    },
    mark: markIdentifier
  };
}(this));