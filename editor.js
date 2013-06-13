
/**
* TODO: 
* 1. also update brackets after the current scope, since they have to be moved
* 2. use function scope to display selected functions in a different (linked) document like codebubbles
*/
  $(function(){
    
    var id_count = 0,
        functions = [],
        identifiers = [],
        oldMarks = [],
        ast = undefined,
        listeners = {},
        bracketContainer = $('.CodeMirror-gutter.brackets');

    var editor = CodeMirror($('#cmeditor').get(0), {
      mode: 'javascript',
      theme: 'monochrome',
      viewportMargin: 10,
      lineNumbers: true,
      gutters: ['CodeMirror-linenumbers', 'brackets']
    });

    //editor.setSize(1400, 800);

    var doc = editor.getDoc();

    var parser = new Worker('parser.js'),
        running = false,
        cleanup = undefined;

    function parse(string, callback, change) {
      
      if (!!cleanup) {
        cleanup = window.clearTimeout(cleanup)
        return parseFull(string, callback);
      }

      // find next functionscope in edit range
      var fromIdx = doc.indexFromPos(change.from); // let's start to work just with one position and not a selection range

      var fun = findPathToPos(fromIdx, ast);

      if (running) {
        // kill current parser thread - this is important
        // since it also prevents our callback to be called and therefore prevents 
        // outdated display-updates
        parser.terminate();        
        // spawn a new one
        parser = new Worker('parser.js');
        running = false;
      }

      if (!!fun) {
        parsePartial(string, fun, change, callback);
      } else {
        parseFull(string, callback);
      }
    }

    function parseFull(string, callback) {

      parser.onmessage = function(e) {
        running = false;
        cleanup = window.clearTimeout(cleanup)
        callback.call(null, e.data, ast);
      }
      parser.onerror = function(e) {
        running = false;
      }

      // start parser
      running = true;
      parser.postMessage(string);
    }

    function parsePartial(string, context, change, callback) {

      var start = context.range[0],
          posChange = calculateChangeLength(change),
          end = context.range[1] + posChange,
          textSlice = string.slice(start, end),
          functionExpr = false;

      if (context.type === "FunctionExpression") {
        textSlice = ['(',textSlice,')'].join('');
        functionExpr = true
      }

      // if it yields an error we have to flag it as error state, wait 
      // some time and reparse with full string to recover
      parser.onmessage = function(e) {
        running = false;
        cleanup = window.clearTimeout(cleanup)

        var partialAst, idxCorr;

        if (functionExpr) {
          // Program(GroupExpr(...))
          partialAst = e.data.body[0].expression;
          idxCorr = start - 1;
        } else {
          // Program(...)
          partialAst = e.data.body[0];
          idxCorr = start;
        }


        // we have to postprocess all position data to match the original position
        estraverse.traverse(partialAst, {
          enter: function(node) {
            node.range = [node.range[0] + idxCorr, node.range[1] + idxCorr]
          }
        });


        // now replace function node in ast
        ast = estraverse.replace(ast, {
          haveSeenFunction: false,

          enter: function(node) {
            if (node === context) {
              this.visitor.haveSeenFunction = true;
              this.skip();
              return partialAst;
            }

            if (this.visitor.haveSeenFunction) {
              node.range[0] = node.range[0] + posChange; //[node.range[0] + posChange, node.range[1] + posChange]
              // also cleanup nodes
              cleanUp(node);
            }
            return node
          },

          // also cleanup parent nodes
          leave: function(node) {

            if (!this.visitor.haveSeenFunction)
              return;

            if (node !== partialAst) {
              node.range[1] = node.range[1] + posChange;
              cleanUp(node);
            }
          }
        });

        // now invalidate only identifiers and functions inside of fun
        callback.call(null, ast, context, partialAst);
      }
      parser.onerror = function(e) {
        running = false;
        if (!cleanup) {
          cleanup = window.setTimeout(function() {
            parseFull(string, callback);
          }, 200);
        }
      }

      // start parser
      running = true;      
      parser.postMessage(textSlice);
    }

    function calculateChangeLength(change) {
      var length = change.text.join('\n').length - change.removed.join('\n').length
      if (!!change.next)
        return length + calculateChangeLength(change.next);
      else
        return length;
    }

    function isFunction(node) {
      return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration';
    }

    function findPathToPos(pos, ast) {

      var found = undefined;
      estraverse.traverse(ast, {

        enter: function(node) {
          if (node.range[0] > pos)
            return this.break();

          if (isFunction(node) && pos >= node.range[0] && pos < node.range[1])
            found = node
        }
      });
      return found;
    }

    function filterByRange(start, end, visitor) {

      var startIdx = doc.indexFromPos({ line: start, ch: 0 }),
          endIdx = doc.indexFromPos({ line: end, ch: 0 });

      var wrappedVisitor = {}

      if (typeof visitor.enter === 'function') {
        wrappedVisitor.enter = function(node) {
          // should this be <= ?
          if (node.range[1] < startIdx)
            return this.skip();

          if (node.range[0] > endIdx)
            return this.break();

          return visitor.enter && visitor.enter.call(this, node);
        }
      }

      // i am not sure of the semantics of skip and break in bottom up traversal
      if (typeof visitor.leave === 'function') {
        wrappedVisitor.leave = function(node) {
          // should this be <= ?
          if (node.range[1] < startIdx)
            this.skip();

          if (node.range[0] > endIdx)
            this.break();

          return visitor.leave && visitor.leave.call(this, node);
        }
      }
      return wrappedVisitor;
    }


    editor.on('change', function(editor, change) {
      parse(doc.getValue(), processAST, change);
    });

    editor.on('viewportChange', function() {
      updateViewport();
    });

    /*editor.on('renderLine', function(editor, line, dom) {
      
      return true

      var id = token.className.match(/id_\d+/)
      if (!id)
        return false;

      var listener = listeners[id]
      if (typeof listener === 'function')
        listener.call(null, token);
    });
*/


    var analyzeWorker = new Worker('bindinganalyzer.js')

    // we received the results from the parser
    function processAST(parsed, oldAst, partialAst) {

      ast = bindingAnalyzer(parsed)

      updateViewport();
        
      // if there is an oldAST we have to clean it up        
      if (!!oldAst) {
        estraverse.traverse(oldAst, { enter: cleanUp })
      }

      // TODO move AST analysis to thread. Problem: This might not work, since only serializable data can 
      // be exchanged
      // > MDN: Structured clones can correctly duplicate objects containing cyclic graphs of references.
      // so it might work out
      
      // partial analysis has to be performed synchronous
      /*if (!!partialAst) {        
        bindingAnalyzer(partialAst, oldAst.bindings.parent)
        cont(ast);
      } else {        
        analyzeWorker.onmessage = function(e) {
          cont(e.data);
        }
        var result = bindingAnalyzer(parsed);
        cont(result);
        //analyzeWorker.postMessage(parsed);
      }*/
    }

    function updateViewport() {
      var viewport = editor.getViewport();

      estraverse.traverse(ast, filterByRange(viewport.from, viewport.to, {
        enter: function(node) {

          // this node is already rendered, it children might not be
          if (!!node.rendered)
            return;

          switch (node.type) {
            case 'FunctionDeclaration':
            case 'FunctionExpression':
              positionInDocument(node);
              drawBrackets(node);                
              break;

            case 'Identifier':
              positionInDocument(node);
              markIdentifier(node);
              break;
          }
          node.rendered = true;
        }        
      }))
    }

    function positionInDocument(node) {
      node.from = doc.posFromIndex(node.range[0]);
      node.to = doc.posFromIndex(node.range[1]);
      return node;
    }

    function addWidget(fun) {
      var widget = document.createElement('div');
      $(widget).addClass('vars-in-scope');
      for (var key in fun.bindings.bindings) {
        if (key === 'arguments' || key === 'this')
          continue;

        $(widget).append($('<span>', {
          html: key,
          'class': 'binding'
        }));
      }
      editor.addWidget(fun.from, widget);
    }

    function cleanUp(node) {

      // we dont have to clean up nodes, that have not been rendered yet
      if (!node.rendered)
        return

      switch (node.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
          node.data && node.data.bracket && node.data.bracket.remove();
          break;
        case 'Identifier':
          node.data && node.data.mark && node.data.mark.clear();
          break;        
      }
      node.rendered = false;
      return node; 
    }

    // TODO again collect all changes to dom and apply at once, like:      
    // `bracketContainer.append.apply(bracketContainer, brackets);`
    function drawBrackets(node) {

      if (!node.bindings) {
        console.log('bindings are missing', node)
        return;
      }

      var textHeight = editor.defaultTextHeight(),
          startOffset = editor.charCoords(node.from, 'local').top,
          endOffset = editor.charCoords(node.to, 'local').top;
          
      var bracket = $('<span>', {
        'class': 'bracket level' + node.bindings.level()
      }).css({
        top: startOffset,
        height: endOffset - startOffset + textHeight
      });
      node.data = {
        bracket: bracket
      }
      $('.CodeMirror-gutter.brackets').append(bracket);      
    }


    /**
     * Todo: only mark identifiers in visible range
     */
    function markIdentifier(node) {

      // node has no binding (might be a binding instance)
      if (!node.boundIn)
        return;

      var level = node.boundIn.level(),

          // this is really ugly. Finding the marked identifier through a unique class...
          // when using replaceWith the result is atomic which is not the desired behaviour
          id = 'id_' + id_count++,
          mark = doc.markText(node.from, node.to, {
            className: 'id level' + level + ' ' + id
          });

      node.data = {
        id: id,
        mark: mark 
      };


      
      // listeners[id] = function(dom) {
      //   //console.log("identifier has been created", dom, el);
      //   $(dom).mouseenter(function() {
      //     console.log("mouse enter on", dom, el);
      //   })
      // }
      
      if (level !== 0) {

        CodeMirror.on(mark, 'beforeCursorEnter', function() {
          
          var highlightMarks = [];

          // show scope
          $(node.boundIn.scope.data.bracket).clearQueue().queue(function() {
            $(this).addClass('show-scope');              
            $(this).dequeue();
          }).delay(3000).queue(function() {
            $(this).removeClass('show-scope');
            $(this).dequeue();
          });

          // highlight all bound instances
          var other = $(node.boundIn.bindings[node.name].boundInstances).each(function(i, identifier) {

            // it has not been rendered and is not visible
            if (!identifier.rendered || !identifier.data)
              return

            $('.level' + level + '.' + identifier.data.id).clearQueue().queue(function() {
              $(this).addClass('highlight-bound');
              $(this).dequeue();
            }).delay(1500).queue(function() {
              $(this).removeClass('highlight-bound');
              $(this).dequeue();
            });
          });
        })
      }
    }

});