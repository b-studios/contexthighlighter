/**
 * This file is part of "Context Highlighter".
 *
 * "Context Highlighter" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Context Highlighter" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Context Highlighter".  If not, see <http://www.gnu.org/licenses/>.
 *
 * Context Highlighting for Javascript
 * ===================================
 * In order to deal with automatical hoisting of `var` declarations on top of functions we
 * simply split the process in two passes:
 *
 * 1. search for declarations and functions (register bindingInstances)
 * 2. search for identifier (register boundInstances)
 *
 * @author Jonathan Brachthäuser
 */
/*global require:true */
var parser = require('esprima'),
    fs = require('fs');


var util = {
  isArray: function(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
  }
};

function Environment(scope, parent) {

  this.scope = scope;
  this.parent = parent;
  this.bindings = Object.create(null);

  this.addBindingInstance = function(name, instance) {
    if (this.bindings[name] === undefined) {
      this.bindings[name] = { bindingInstances: [], boundInstances: [] };
    }
    this.bindings[name].bindingInstances.push(instance);
    return this;
  };

  this.addBoundInstance = function(name, instance) {
    if (this.bindings[name] === undefined) {
      this.bindings[name] = { bindingInstances: [], boundInstances: [] };
    }    
    this.bindings[name].boundInstances.push(instance);
    return this;
  };

  this.hasBinding = function(name) {
    return this.bindings[name] !== undefined;
  };

  this.findBindingEnv = function(name) {
      
    if (this.bindings[name] !== undefined) {
      return this;
    
    } else if (this.parent !== undefined) {
      return this.parent.findBindingEnv(name);
    
    // we are the global environment
    } else {
      this.bindings[name] = { bindingInstances: [], boundInstances: [] }
      return this;
    }        
  };

  this.level = function() {
    if (this.parent === undefined) 
      return 0;
    
    else
      return this.parent.level() + 1;
  };
}

function performBindingAnalysis(ast) {


  function analyzeBindingInstances(node, env) {

    var newEnv, i;

    // node my be an array containing nodes
    if (util.isArray(node)) {
      for (i = 0; i < node.length; i++) 
          analyzeBindingInstances(node[i], env); 

      return;
    }

    // it's no array and no real node
    if (!node || !node.type)
      return;

    // it's an ast-node
    switch (node.type) {
      
      case 'FunctionDeclaration':
      case 'FunctionExpression':

        // create a new binding environment (function scope)
        newEnv = new Environment(node, env)
        node.bindings = newEnv

        if (node.type === 'FunctionDeclaration')
          env.addBindingInstance(node.id.name, node.id)
      
        // it's a named function expression
        else if (!!node.id)
          newEnv.addBindingInstance(node.id.name, node.id)
        
        // the parameters are bound by the function
        for (i = 0; i < node.params.length; i++)
          newEnv.addBindingInstance(node.params[i].name, node.params[i])
        
        analyzeBindingInstances(node.body, newEnv)
        break;
        
      case 'VariableDeclarator':
        env.addBindingInstance(node.id.name, node)
        analyzeBindingInstances(node.init, env);
        break;
        
      default:
        for(var key in node) {
          if (node.hasOwnProperty(key))
            analyzeBindingInstances(node[key], env)
        }
        break;
    }     
  }

  function analyzeBoundInstances(node, env) {

    var i, key;

    if (util.isArray(node)) {
      for (i = 0; i < node.length; i++)
        analyzeBoundInstances(node[i], env);

      return;
    }

    if (!node || !node.type)
      return;

    switch (node.type) {
      case 'Identifier':
        node.boundIn = env.findBindingEnv(node.name)
                          .addBoundInstance(node.name, node)
        break;
  
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        analyzeBoundInstances(node.body, node.bindings);
        analyzeBoundInstances(node.id, node.bindings); 

        for (i = 0; i < node.params.length; i++) {
          node.params[i].boundIn = node.bindings
        }
        break;
          
      // skip the names of object - properties
      case 'Property':
        analyzeBoundInstances(node.value, env);
        break;

      // don't analze bindings of member expression id that are not computed like `bar` in `foo.bar`
      case 'MemberExpression':
        analyzeBoundInstances(node.object, env);

        // if it is computed, then also check bindings for the access expression
        if (node.computed)
          analyzeBoundInstances(node.property, env)
        
        break;

      default:
        for(key in node) {
          if (node.hasOwnProperty(key))
            analyzeBoundInstances(node[key], env)
        }
        break;
    }
  }

  var globalEnv = new Environment(ast, undefined)
  ast.scope_id = 'globalscope'
  ast.bindings = globalEnv
  analyzeBindingInstances(ast, globalEnv)
  analyzeBoundInstances(ast, globalEnv)
  return ast;
}

function toHtmlString(ast, rawText) {

  function Slice(range, contents) {
    this.start = range[0]
    this.end = range[1]
    this.contents = contents
  }

  function collectTokenSlices() {

    // gather lexical information
    var tokenSlices = [],
        tokens = ast.tokens.concat(ast.comments),
        i, token;

    for (i = 0; i < tokens.length; i++) {
      token = tokens[i]
      switch (token.type) {
        case 'Keyword':
          tokenSlices.push(new Slice(token.range, "<span class='keyword'>" + token.value + "</span>"));
          break;

        case 'Punctuator':
          tokenSlices.push(new Slice(token.range, "<span class='punctuator'>" + token.value + "</span>"));
          break;

        case 'Numeric':
        case 'RegularExpression':
        case 'String':
        case 'Null':
          tokenSlices.push(new Slice(token.range, "<span class='constant'>" + token.value + "</span>"));
          break;

        // comments
        case 'Line':
          tokenSlices.push(new Slice(token.range, "<span class='comment line'>" + sliceText(token.range) + "</span>"));
          break;

        case 'Block':
          tokenSlices.push(new Slice(token.range, "<span class='comment block'>" + sliceText(token.range) + "</span>"));
      }
    }

    return tokenSlices;
  }

  function sliceText(range) {
    return rawText.slice(range[0],range[1]).replace(/[&<>]/g, function(c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
      }[c] || c;
    })
  }

  var sliceWithTokens = (function(tokenSlices) {
    return function(range) {

      if (tokenSlices === undefined)
        tokenSlices = collectTokenSlices();

      var tokens = tokenSlices.filter(function(token) {
        return token.start >= range[0] && token.end <= range[1]
      })

      if (tokens.length > 0)
        return mergeParts(range, tokens).contents

      return sliceText(range)
    }
  }).call(null, collectTokenSlices())

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

    return new Slice(range, result.join(''));
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
        return new Slice(node.range, "<span id='" + scope_id + "' class='function level" + node.bindings.level() + "'>" + slice.contents + "</span>");

      case 'Identifier':
        if (!node.boundIn) 
          return new Slice(node.range, "<span class='id'>" + sliceWithTokens(node.range) + "</span>")
        else {
          return new Slice(node.range, "<span data-scope='" + node.boundIn.scope.scope_id + "' class='id level" + node.boundIn.level() + "'>" + sliceWithTokens(node.range) + "</span>");
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

function processFile(filename, targetFile) {
  var contents = fs.readFileSync(filename, "utf8"),
      template = fs.readFileSync("./_template.html", "utf8"),
      parsed = parser.parse(contents, {        
        range: true,
        tokens: true,
        comment: true
      }),
      astWithBindings = performBindingAnalysis(parsed),
      output = toHtmlString(astWithBindings, contents);

  fs.writeFileSync(targetFile, template.replace("<% content %>", output));
}

processFile("./contexthighlighting.js", "output.html")