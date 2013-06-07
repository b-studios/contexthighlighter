function Visitor(visit, mergeResults) {

  // [Node, null, [Node]] => Result
  function traverseAll() {
    var first = Array.prototype.pop.apply(arguments);

    if (first === undefined)
      return undefined;

    if (arguments.length == 0) {
      if (Object.prototype.toString.call(first) !== '[object Array]') {
        return traverse(first);
      } else {
        return traverseAll.apply(null, first);
      }
    }

    return mergeResults(traverseAll(first), traverseAll.apply(null, arguments))
  }

  function traverse(node) {
    
    var toTraverse = [], i, property;

    if (!node || !node.type)
      return undefined

    switch (node.type) {

      // interface Program <: Node {
      //     type: "Program";
      //     body: [ Statement ];
      // }
      case 'Program': 
        if (!!visit.Program)
          return visit.Program.call(node, node.body);
        else
          return traverseAll(node.body);

      /**
       * Statements
       */

      // interface EmptyStatement <: Statement {
      //     type: "EmptyStatement";
      // }
      case 'EmptyStatement':
        if (!!visit.EmptyStatement)
          return visit.EmptyStatement.call(node);
        else
          return undefined;

      // interface BlockStatement <: Statement {
      //     type: "BlockStatement";
      //     body: [ Statement ];
      // }
      case 'BlockStatement':
        if (!!visit.BlockStatement)
          return visit.BlockStatement.call(node, node.body);
        else
          return traverseAll(node.body);

      // interface ExpressionStatement <: Statement {
      //     type: "ExpressionStatement";
      //     expression: Expression;
      // }
      case 'ExpressionStatement':
        if (!!visit.ExpressionStatement)
          return visit.ExpressionStatement.call(node, node.expression);
        else
          return traverse(node.expression);

      // interface IfStatement <: Statement {
      //     type: "IfStatement";
      //     test: Expression;
      //     consequent: Statement;
      //     alternate: Statement | null;
      // }
      case 'IfStatement':
        if (!!visit.IfStatement)
          return visit.IfStatement.call(node, node.test, node.consequent, node.alternate);
        else
          return traverseAll(node.test, node.consequent, node.alternate);

      // interface LabeledStatement <: Statement {
      //     type: "LabeledStatement";
      //     label: Identifier;
      //     body: Statement;
      // }
      case 'LabeledStatement':
        if (!!visit.LabeledStatement)
          return visit.LabeledStatement.call(node, node.label, node.body);
        else
          return traverseAll(node.label, node.body);

      // interface BreakStatement <: Statement {
      //     type: "BreakStatement";
      //     label: Identifier | null;
      // }
      case 'BreakStatement':
        if (!!visit.BreakStatement)
          return visit.BreakStatement.call(node, node.label);
        else
          return traverseAll(node.label);
          
      // interface ContinueStatement <: Statement {
      //     type: "ContinueStatement";
      //     label: Identifier | null;
      // }
      case 'ContinueStatement':
        if (!!visit.ContinueStatement)
          return visit.ContinueStatement.call(node, node.label);
        else
          return traverseAll(node.label);
          
      // interface WithStatement <: Statement {
      //     type: "WithStatement";
      //     object: Expression;
      //     body: Statement;
      // }
      case 'WithStatement':
        if (!!visit.WithStatement)
          return visit.WithStatement.call(node, node.object, node.body);
        else
          return traverseAll(node.object, node.body);
          
      // interface SwitchStatement <: Statement {
      //     type: "SwitchStatement";
      //     discriminant: Expression;
      //     cases: [ SwitchCase ];
      //     lexical: boolean;
      // }
      case 'SwitchStatement':
        if (!!visit.SwitchStatement)
          return visit.SwitchStatement.call(node, node.discriminant, node.cases, node.lexical);
        else
          return traverseAll(node.discriminant, node.cases);
          
      // interface ReturnStatement <: Statement {
      //     type: "ReturnStatement";
      //     argument: Expression | null;
      // }
      case 'ReturnStatement':
        if (!!visit.ReturnStatement)
          return visit.ReturnStatement.call(node, node.argument);
        else
          return traverseAll(node.argument);

      // interface ThrowStatement <: Statement {
      //     type: "ThrowStatement";
      //     argument: Expression;
      // }
      case 'ThrowStatement':
        if (!!visit.ThrowStatement)
          return visit.ThrowStatement.call(node, node.argument);
        else
          return traverseAll(node.argument);

      // interface TryStatement <: Statement {
      //     type: "TryStatement";
      //     block: BlockStatement;
      //     handler: CatchClause | null;
      //     guardedHandlers: [ CatchClause ];
      //     finalizer: BlockStatement | null;
      // }
      case 'TryStatement':
        if (!!visit.TryStatement)
          return visit.TryStatement.call(node, node.block, node.handler, node.guardedHandlers, node.finalizer);
        else
          return traverseAll(node.block, node.handler, node.guardedHandlers, node.finalizer);

      // interface WhileStatement <: Statement {
      //     type: "WhileStatement";
      //     test: Expression;
      //     body: Statement;
      // }
      case 'WhileStatement':
        if (!!visit.WhileStatement)
          return visit.WhileStatement.call(node, node.test, node.body);
        else
          return traverseAll(node.test, node.body);

      // interface DoWhileStatement <: Statement {
      //     type: "DoWhileStatement";
      //     body: Statement;
      //     test: Expression;
      // }
      case 'DoWhileStatement':
        if (!!visit.DoWhileStatement)
          return visit.DoWhileStatement.call(node, node.body, node.test);
        else
          return traverseAll(node.body, node.test);

      // interface ForStatement <: Statement {
      //     type: "ForStatement";
      //     init: VariableDeclaration | Expression | null;
      //     test: Expression | null;
      //     update: Expression | null;
      //     body: Statement;
      // }
      case 'ForStatement':
        if (!!visit.ForStatement)
          return visit.ForStatement.call(node, node.init, node.test, node.update, node.body);
        else
          return traverseAll(node.init, node.test, node.update, node.body);

      // interface ForInStatement <: Statement {
      //     type: "ForInStatement";
      //     left: VariableDeclaration |  Expression;
      //     right: Expression;
      //     body: Statement;
      //     each: boolean;
      // }
      case 'ForInStatement':
        if (!!visit.ForInStatement)
          return visit.ForInStatement.call(node, node.left, node.right, node.body, node.each);
        else
          return traverseAll(node.left, node.right, node.body);

      // interface ForOfStatement <: Statement {
      //     type: "ForOfStatement";
      //     left: VariableDeclaration |  Expression;
      //     right: Expression;
      //     body: Statement;
      // }
      case 'ForOfStatement':
        if (!!visit.ForOfStatement)
          return visit.ForOfStatement.call(node, node.left, node.right, node.body);
        else
          return traverseAll(node.left, node.right, node.body);


      /**
       * Declarations
       */

      // interface FunctionDeclaration <: Function, Declaration {
      //     type: "FunctionDeclaration";
      //     id: Identifier;
      //     params: [ Pattern ];
      //     defaults: [ Expression ];
      //     rest: Identifier | null;
      //     body: BlockStatement | Expression;
      //     generator: boolean;
      //     expression: boolean;
      // }
      case 'FunctionDeclaration':
        if (!!visit.FunctionDeclaration)
          return visit.FunctionDeclaration.call(node, node.id, node.params, node.defaults, node.rest, node.body, node.generator, node.expression);
        else
          return traverseAll(node.id, node.params, node.defaults, node.rest, node.body);

      // interface VariableDeclaration <: Declaration {
      //     type: "VariableDeclaration";
      //     declarations: [ VariableDeclarator ];
      //     kind: "var" | "let" | "const";
      // }
      case 'VariableDeclaration':
        if (!!visit.VariableDeclaration)
          return visit.VariableDeclaration.call(node, node.declarations, node.kind);
        else
          return traverseAll(node.declarations);

      // interface VariableDeclarator <: Node {
      //     type: "VariableDeclarator";
      //     id: Pattern;
      //     init: Expression | null;
      // }
      case 'VariableDeclarator':
        if (!!visit.VariableDeclarator)
          return visit.VariableDeclarator.call(node, node.id, node.init);
        else
          return traverseAll(node.id, node.init);


      /**
       * Expressions
       */

      // interface ThisExpression <: Expression {
      //     type: "ThisExpression";
      // }
      case 'ThisExpression':
        if (!!visit.ThisExpression)
          return visit.ThisExpression.call(node);
        else
          return undefined;

      // interface ArrayExpression <: Expression {
      //     type: "ArrayExpression";
      //     elements: [ Expression | null ];
      // }
      case 'ArrayExpression':
        if (!!visit.ArrayExpression)
          return visit.ArrayExpression.call(node, node.elements);
        else
          return traverseAll(node.elements);

      // interface ObjectExpression <: Expression {
      //     type: "ObjectExpression";
      //     properties: [ { key: Literal | Identifier,
      //                     value: Expression,
      //                     kind: "init" | "get" | "set" } ];
      // }
      case 'ObjectExpression':
        if (!!visit.ObjectExpression)
          return visit.ObjectExpression.call(node, node.properties);
        else {
          toTraverse = [];
          for (i = 0; i < node.properties.length; i++) {
            property = node.properties[i]
            toTraverse.push(property.key);
            toTraverse.push(property.value);
          }
          return traverseAll(toTraverse);
        }          

      // interface FunctionExpression <: Function, Expression {
      //     type: "FunctionExpression";
      //     id: Identifier | null;
      //     params: [ Pattern ];
      //     defaults: [ Expression ];
      //     rest: Identifier | null;
      //     body: BlockStatement | Expression;
      //     generator: boolean;
      //     expression: boolean;
      // }
      case 'FunctionExpression':
        if (!!visit.FunctionExpression)
          return visit.FunctionExpression.call(node, node.id, node.params, node.defaults, node.rest, node.body, node.generator, node.expression);
        else
          return traverseAll(node.id, node.params, node.defaults, node.rest, node.body);


      // interface SequenceExpression <: Expression {
      //     type: "SequenceExpression";
      //     expressions: [ Expression ];
      // }
      case 'SequenceExpression':
        if (!!visit.SequenceExpression)
          return visit.SequenceExpression.call(node, node.expressions);
        else
          return traverseAll(node.expressions);

      // interface UnaryExpression <: Expression {
      //     type: "UnaryExpression";
      //     operator: UnaryOperator;
      //     prefix: boolean;
      //     argument: Expression;
      // }
      case 'UnaryExpression':
        if (!!visit.UnaryExpression)
          return visit.UnaryExpression.call(node, node.operator, node.prefix, node.argument);
        else
          return traverseAll(node.argument);

      // interface BinaryExpression <: Expression {
      //     type: "BinaryExpression";
      //     operator: BinaryOperator;
      //     left: Expression;
      //     right: Expression;
      // }
      case 'BinaryExpression':
        if (!!visit.BinaryExpression)
          return visit.BinaryExpression.call(node, node.operator, node.left, node.right);
        else
          return traverseAll(node.left, node.right);

      // interface AssignmentExpression <: Expression {
      //     type: "AssignmentExpression";
      //     operator: AssignmentOperator;
      //     left: Expression;
      //     right: Expression;
      // }
      case 'AssignmentExpression':
        if (!!visit.AssignmentExpression)
          return visit.AssignmentExpression.call(node, node.operator, node.left, node.right);
        else
          return traverseAll(node.left, node.right);

      // interface UpdateExpression <: Expression {
      //     type: "UpdateExpression";
      //     operator: UpdateOperator;
      //     argument: Expression;
      //     prefix: boolean;
      // }
      case 'UpdateExpression':
        if (!!visit.UpdateExpression)
          return visit.UpdateExpression.call(node, node.operator, node.argument, node.prefix);
        else
          return traverseAll(node.argument);

      // interface LogicalExpression <: Expression {
      //     type: "LogicalExpression";
      //     operator: LogicalOperator;
      //     left: Expression;
      //     right: Expression;
      // }
      case 'LogicalExpression':
        if (!!visit.LogicalExpression)
          return visit.LogicalExpression.call(node, node.operator, node.left, node.right);
        else
          return traverseAll(node.left, node.right);

      // interface ConditionalExpression <: Expression {
      //     type: "ConditionalExpression";
      //     test: Expression;
      //     alternate: Expression;
      //     consequent: Expression;
      // }
      case 'ConditionalExpression':
        if (!!visit.ConditionalExpression)
          return visit.ConditionalExpression.call(node, node.test, node.alternate, node.consequent);
        else
          return traverseAll(node.test, node.alternate, node.consequent);

      // interface NewExpression <: Expression {
      //     type: "NewExpression";
      //     callee: Expression;
      //     arguments: [ Expression | null ];
      // }
      case 'NewExpression':
        if (!!visit.NewExpression)
          return visit.NewExpression.call(node, node.callee, node.arguments);
        else
          return traverseAll(node.callee, node.arguments);

      // interface CallExpression <: Expression {
      //     type: "CallExpression";
      //     callee: Expression;
      //     arguments: [ Expression | null ];
      // }
      case 'CallExpression':
        if (!!visit.CallExpression)
          return visit.CallExpression.call(node, node.callee, node.arguments);
        else
          return traverseAll(node.callee, node.arguments);

      // interface MemberExpression <: Expression {
      //     type: "MemberExpression";
      //     object: Expression;
      //     property: Identifier | Expression;
      //     computed: boolean;
      // }
      case 'MemberExpression':
        if (!!visit.MemberExpression)
          return visit.MemberExpression.call(node, node.object, node.property, node.computed);
        else
          return traverseAll(node.object, node.property);

  
      // interface SwitchCase <: Node {
      //     type: "SwitchCase";
      //     test: Expression | null;
      //     consequent: [ Statement ];
      // }
      case 'SwitchCase':
        if (!!visit.SwitchCase)
          return visit.SwitchCase.call(node, node.test, node.consequent);
        else
          return traverseAll(node.test, node.consequent);

      // interface CatchClause <: Node {
      //     type: "CatchClause";
      //     param: Pattern;
      //     guard: Expression | null;
      //     body: BlockStatement;
      // }
      case 'CatchClause':
        if (!!visit.CatchClause)
          return visit.CatchClause.call(node, node.param, node.guard, node.body);
        else
          return traverseAll(node.param, node.guard, node.body);

      // interface Identifier <: Node, Expression, Pattern {
      //     type: "Identifier";
      //     name: string;
      // }
      case 'Identifier':
        if (!!visit.Identifier)
          return visit.Identifier.call(node, node.name);
        else
          return undefined;

      // interface Literal <: Node, Expression {
      //     type: "Literal";
      //     value: string | boolean | null | number | RegExp;
      // }
      case 'Literal':
        if (!!visit.Literal)
          return visit.Literal.call(node, node.value);
        else
          return undefined;
    }
  }

  return {
    traverse: traverse,
    traverseAll: traverseAll
  }
}
