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
 * @author Jonathan Brachthaeuser
 */
/*jslint vars: true, newcap: true, undef: true */
/*global esprima: true */
importScripts('../lib/esprima/esprima.js');

onmessage = function (e) {

  if (e === undefined) {
    return;
  }

  var ast = esprima.parse(e.data, {
    range: true,
    tolerant: true
  });

  postMessage(ast);
};