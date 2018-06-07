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

    CodeMirror.xmlHints = [];

    CodeMirror.xmlHint = function(cm, simbol) {

        if(simbol.length > 0) {
            var cursor = cm.getCursor();
            cm.replaceSelection(simbol);
            cursor = {line: cursor.line, ch: cursor.ch + 1};
            cm.setCursor(cursor);
        }

        CodeMirror.simpleHint(cm, getHint);
    };

    var getHint = function(cm) {

        var cursor = cm.getCursor();

        if (cursor.ch > 0) {

            var text = cm.getRange({line: 0, ch: 0}, cursor);
            var typed = '';
            var simbol = '';
            for(var i = text.length - 1; i >= 0; i--) {
                if(text[i] == ' ' || text[i] == '<') {
                    simbol = text[i];
                    break;
                }
                else {
                    typed = text[i] + typed;
                }
            }

            text = text.slice(0, text.length - typed.length);

            var path = getActiveElement(text) + simbol;
            var hints = CodeMirror.xmlHints[path];

            if(typeof hints === 'undefined')
                hints = [''];
            else {
                hints = hints.slice(0);
                for (var i = hints.length - 1; i >= 0; i--) {
                    if(hints[i].indexOf(typed) != 0)
                        hints.splice(i, 1);
                }
            }

            return {
                list: hints,
                from: { line: cursor.line, ch: cursor.ch - typed.length },
                to: cursor
            };
        };
    };

    var getActiveElement = function(text) {

        var element = '';

        if(text.length >= 0) {

            var regex = new RegExp('<([^!?][^\\s/>]*).*?>', 'g');

            var matches = [];
            var match;
            while ((match = regex.exec(text)) != null) {
                matches.push({
                    tag: match[1],
                    selfclose: (match[0].slice(match[0].length - 2) === '/>')
                });
            }

            for (var i = matches.length - 1, skip = 0; i >= 0; i--) {

                var item = matches[i];

                if (item.tag[0] == '/')
                {
                    skip++;
                }
                else if (item.selfclose == false)
                {
                    if (skip > 0)
                    {
                        skip--;
                    }
                    else
                    {
                        element = '<' + item.tag + '>' + element;
                    }
                }
            }

            element += getOpenTag(text);
        }

        return element;
    };

    var getOpenTag = function(text) {

        var open = text.lastIndexOf('<');
        var close = text.lastIndexOf('>');

        if (close < open)
        {
            text = text.slice(open);

            if(text != '<') {

                var space = text.indexOf(' ');
                if(space < 0)
                    space = text.indexOf('\t');
                if(space < 0)
                    space = text.indexOf('\n');

                if (space < 0)
                    space = text.length;

                return text.slice(0, space);
            }
        }

        return '';
    };

})();
