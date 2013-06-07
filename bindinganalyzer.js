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

  function performBindingAnalysis(ast) {

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
          newEnv = new Environment(node, env);
          node.bindings = newEnv;
          env.addBindingInstance('arguments', node);

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

        case 'ThisExpression':
          node.boundIn = env.addBoundInstance('this', node);
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

  return performBindingAnalysis;

}).call(this);