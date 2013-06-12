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
 * @author Jonathan Brachthaeuser
 */
/*global require:true */
var bindingAnalyzer = (function() {

  function performBindingAnalysis(ast, env) {

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

    var bindingInstanceAnalyzer = {
      env: undefined,

      enter: function(node) {

        var env = this.visitor.env

        switch (node.type) {        
          case 'FunctionDeclaration':
          case 'FunctionExpression':

            // create a new binding environment (function scope)
            var oldEnv = env
            env = this.visitor.env = new Environment(node, env);
            node.bindings = env;
            env.addBindingInstance('arguments', node);

            if (node.type === 'FunctionDeclaration')
              oldEnv.addBindingInstance(node.id.name, node.id)
          
            // it's a named function expression
            else if (!!node.id)
              env.addBindingInstance(node.id.name, node.id)
            
            // the parameters are bound by the function
            for (i = 0; i < node.params.length; i++)
              env.addBindingInstance(node.params[i].name, node.params[i])
            

            // don't analyze parameters!
            break;
            
          case 'VariableDeclarator':
            env.addBindingInstance(node.id.name, node);
            // don't analyze node.id
            break;
        }
      },
      leave:  function(node) {
        switch (node.type) {        
          case 'FunctionDeclaration':
          case 'FunctionExpression':
            this.visitor.env = this.visitor.env.parent
            break;           
        }
      }
    }

    function analyzeBindingInstances(node, env) {
      var visitor = Object.create(bindingInstanceAnalyzer);
      visitor.env = env
      estraverse.traverse(node, visitor);
    }

    var boundInstanceAnalyzer = {

      env: undefined,

      enter: function(node) {

        var env = this.visitor.env;

        switch (node.type) {

          case 'Identifier':
            node.boundIn = env.findBindingEnv(node.name)
                              .addBoundInstance(node.name, node)
            break;
      
          case 'FunctionDeclaration':
          case 'FunctionExpression':            
            for (i = 0; i < node.params.length; i++) {
              node.params[i].boundIn = node.bindings
            }
            this.visitor.env = node.bindings;
            break;
              
          // skip the names of object - properties
          case 'Property':
            this.skip();
            analyzeBoundInstances(node.value, env);
            break;

          case 'ThisExpression':
            node.boundIn = env.addBoundInstance('this', node);
          break;

          // don't analze bindings of member expression id that are not computed like `bar` in `foo.bar`
          case 'MemberExpression':
            analyzeBoundInstances(node.object, env);

            // if it is computed, then also check bindings for the access expression
            if (!node.computed)
              this.skip();
            
            break;
        }
      },
      leave:  function(node) {
        switch (node.type) {        
          case 'FunctionDeclaration':
          case 'FunctionExpression':
            this.visitor.env = this.visitor.env.parent
            break;           
        }
      }
    }
    function analyzeBoundInstances(node, env) {
      var visitor = Object.create(boundInstanceAnalyzer);
      visitor.env = env
      estraverse.traverse(node, visitor);
    }

    var globalEnv = env || new Environment(ast, undefined)
    ast.scope_id = 'globalscope'
    ast.bindings = globalEnv
    analyzeBindingInstances(ast, globalEnv)
    analyzeBoundInstances(ast, globalEnv)
    return ast;
  }

  return performBindingAnalysis;

}).call(this);