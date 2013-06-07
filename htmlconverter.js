/**
 * the parameter `doc` is the document creator, which defaults to a string representation
 * of a html document. Can be easily changed to create DOM nodes.
 */
function htmlConverter(ast, rawText, doc) {

  doc = doc || {

    /**
     * string => document
     */
    text: function(text) {
      return text;
    },
    
    /**
     * string, {string: string}, document => document
     * string, {string: string}, [document] => document
     */
    node: function(type, attr, contents) {
      var node = ['<',type];
      for (var key in attr) {
        if (attr.hasOwnProperty(key))
          node.push(' ', key, '="', attr[key],'"')
      }
      node.push('>');

      if (util.isArray(contents))
        node = node.concat(contents)
      else
        node.push(contents)

      node.push('</', type, '>');

      return node.join('');
    },

    /**
     * [documents] => document
     */
    merge: function(documents) {
      return documents.join('');
    }
  }

  function Slice(range, contents) {
    this.start = range[0]
    this.end = range[1]
    this.contents = contents
  }

  function collectTokenSlices() {

    // gather lexical information
    var tokenSlices = [],
        tokens = ast.tokens.concat(ast.comments),
        i, token, node;

    for (i = 0; i < tokens.length; i++) {
      token = tokens[i];
      switch (token.type) {
        case 'Keyword':
          node = doc.node('span', { 'class': 'keyword' }, doc.text(token.value));
          break;

        case 'Punctuator':
          node = doc.node('span', { 'class': 'punctuator' }, doc.text(token.value));
          break;

        case 'Numeric':
        case 'RegularExpression':
        case 'String':
        case 'Null':
          node = doc.node('span', { 'class': 'constant' }, doc.text(token.value));
          break;

        // comments
        case 'Line':
          node = doc.node('span', { 'class': 'comment line' }, doc.text(sliceText(token.range)));
          break;

        case 'Block':
          node = doc.node('span', { 'class': 'comment block' }, doc.text(sliceText(token.range)));
          break;
      }
      tokenSlices.push(new Slice(token.range, node))
    }

    return tokenSlices;
  }

  /**
   * returns a string
   */
  function sliceText(range) {
    return rawText.slice(range[0],range[1]).replace(/[&<>]/g, function(c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
      }[c] || c;
    })
  }

  /**
   * returns a document
   */
  var sliceWithTokens = (function(tokenSlices) {

    tokenSlices = tokenSlices.sort(function(a,b) { return a.start - b.start })

    return function(range) {

      var tokens = [], i = 0;

      while (i < tokenSlices.length && tokenSlices[i].end <= range[1]) {
        if ( tokenSlices[i].start >= range[0])
          tokens.push(tokenSlices[i]);
        i++;
      }

      if (tokens.length > 0)
        return mergeParts(range, tokens).contents

      return doc.text(sliceText(range))
    }
  }).call(null, collectTokenSlices())

  /**
   * returns a document
   */
  function mergeParts(range, slices) {

    var start = range[0], end = range[1],
        result = [], pos = start, i, slice;

    // fill in the gaps between the slices
    slices = slices.filter(function(slice) { return !!slice })
                   .sort(function(a,b) { return a.start - b.start })

    for (i = 0; i < slices.length; i++) {

      slice = slices[i];

      // fill the gap before the slice
      if (slice.start > pos)
        result.push(sliceWithTokens([pos, slice.start]))
      
      // add the slice
      result.push(slice.contents)
      pos = slice.end
    }

    // fill gap after last slice
    if (pos < end)
      result.push(sliceWithTokens([pos, end]))

    return new Slice(range, doc.merge(result));
  }

  function allToText(nodes) {

    var slices = [], i, key, slice;

    if (util.isArray(nodes)) {
      for (i = 0; i < nodes.length; i++) {
        slice = toText(nodes[i])

        if (slice !== undefined)
          slices.push(slice)
      }

    // it's an object -> we use the values of the object
    } else {
      for (key in nodes) {
        if (!nodes.hasOwnProperty(key))
          continue;

        slice = toText(nodes[key])

        if (slice !== undefined)
          slices.push(slice)
      }
    } 

    return slices;
  }

  var uniqueId = (function() {
    var counter = 0;
    return function(name) {
      return [name,"_", counter++].join('')
    }
  }).call()

  function toText(node) {

    if (!node || !node.type)
      return undefined;

    switch (node.type) {

      case 'FunctionDeclaration':
      case 'FunctionExpression':
        var scope_id = uniqueId("scope");
        node.scope_id = scope_id;
        var slice = mergeParts(node.range, allToText([node.id, node.body].concat(node.params)));
        return new Slice(node.range, doc.node('span', { 
          'id': scope_id, 
          'class': 'function level' + node.bindings.level()
        }, slice.contents));

      case 'Identifier':
      case 'ThisExpression':
        if (!node.boundIn) 
          return new Slice(node.range, doc.node('span', { 'class': 'id unbound' }, doc.text(sliceText(node.range))))
        else {
          return new Slice(node.range, doc.node('span', { 
            'class': 'id level' + node.boundIn.level(),
            'data-scope': node.boundIn.scope.scope_id
          }, doc.text(sliceText(node.range))))
        }

      // nothing special happens here
      case 'Program':
        return mergeParts([0, rawText.length], allToText(node.body));

      case 'BlockStatement':
        return mergeParts(node.range, allToText(node.body));

      case 'SwitchStatement':
        return mergeParts(node.range, allToText([node.discriminant].concat(node.cases)));

      case 'TryStatement':
        return mergeParts(node.range, allToText([node.block, node.handler, node.finalizer].concat(node.guardedHandlers)));

      case 'VariableDeclaration':
        return mergeParts(node.range, allToText(node.declarations));

      case 'ArrayExpression':
        return mergeParts(node.range, allToText(node.elements));

      case 'ObjectExpression':
        return mergeParts(node.range, allToText(node.properties));

      case 'SequenceExpression':
        return mergeParts(node.range, allToText(node.expressions));      

      case 'NewExpression':
      case 'CallExpression':
        return mergeParts(node.range, allToText([node.callee].concat(node.arguments)));

      case 'ComprehensionExpression':
      case 'GeneratorExpression':
        return mergeParts(node.range, allToText(node.blocks));

      case 'SwitchCase':
        return mergeParts(node.range, allToText(node.consequent));      

      default:
        return mergeParts(node.range, allToText(node));
    } 
  }

  return toText(ast).contents
}