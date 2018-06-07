/*!
governify-service-sabius-data-publications 1.0.0, built on: 2018-04-27
Copyright (C) 2018 ISA group
http://www.isa.us.es/
https://github.com/isa-group/governify-service-sabius-data-publications

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.*/

(function() {
  CodeMirror.commands.newlineAndIndentContinueMarkdownList = function(cm) {
    var pos = cm.getCursor(), token = cm.getTokenAt(pos);
    var space;
    if (token.className == "string") {
      var full = cm.getRange({line: pos.line, ch: 0}, {line: pos.line, ch: token.end});
      var listStart = /\*|\d+\./, listContinue;
      if (token.string.search(listStart) == 0) {
        var reg = /^[\W]*(\d+)\./g;
        var matches = reg.exec(full);
        if(matches)
          listContinue = (parseInt(matches[1]) + 1) + ".  ";
        else
          listContinue = "*   ";
        space = full.slice(0, token.start);
        if (!/^\s*$/.test(space)) {
          space = "";
          for (var i = 0; i < token.start; ++i) space += " ";
        }
      }
    }

    if (space != null)
      cm.replaceSelection("\n" + space + listContinue, "end");
    else
      cm.execCommand("newlineAndIndent");
  };
})();
