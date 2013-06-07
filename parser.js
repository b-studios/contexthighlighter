importScripts('vendor/esprima/esprima.js');

onmessage = function(e) {

  if (e === undefined)
    return;

  var ast = esprima.parse(e.data, {        
    range: true
  });

  postMessage(ast);
};




    /*
    // If parse is called faster then it can finish the next parsing should be
    // delayed a bit.
     
    var parser = new Worker('parser.js'),
        pending = false, running = false,
        lastParseTime = 0;
    function parse(string, callback) {

      console.log(lastParseTime)

      // there already is a pending parse
      if (pending) {
        window.clearTimeout(pending);
        pending = undefined;
      }

      // queue up
      if (running) {
        pending = window.setTimeout(function() {
            pending = undefined;
            parse(string, callback);
        }, lastParseTime);
      } else {
        
        var timeBefore = new Date();
        parser.onmessage = function(result) {
          lastParseTime = new Date() - timeBefore;
          running = false;
          callback.call(null, result);
        }
        running = true;
        parser.postMessage(string);
      }      
    }
    */