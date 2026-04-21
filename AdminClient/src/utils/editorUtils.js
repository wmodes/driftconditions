// editorUtils.js

import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-json5';

// Define a custom Ace mode that extends the built-in JSON5 mode,
// adding keyword highlights for `track` and `clips`.
//
// Because JSON5 strings and comments are tokenized in their own states,
// these keyword rules only fire in code positions — not inside comments or strings.
export const defineCustomEditorMode = () => {
  const oop = ace.require("ace/lib/oop");
  const Json5Mode = ace.require("ace/mode/json5").Mode;

  // Get the HighlightRules class from a temporary JSON5 mode instance
  const Json5HighlightRules = (new Json5Mode()).HighlightRules;

  function CustomHighlightRules() {
    Json5HighlightRules.call(this);

    const keywordRules = [
      { token: "editor-highlight-track", regex: "\\btracks\\b" },
      { token: "editor-highlight-clip",  regex: "\\bclips\\b" },
    ];

    // The JSON5 tokenizer uses multiple states (start, object, array, etc.).
    // We don't know exactly which state handles unquoted keys, so prepend to all
    // states except string and comment states — those consume their own content
    // and won't accidentally match our word-bounded keyword rules anyway.
    Object.keys(this.$rules).forEach(state => {
      if (!/string|comment/i.test(state)) {
        this.$rules[state].unshift(...keywordRules);
      }
    });

    this.normalizeRules();
  }
  oop.inherits(CustomHighlightRules, Json5HighlightRules);

  function Mode() {
    Json5Mode.call(this);
    this.HighlightRules = CustomHighlightRules;
  }
  oop.inherits(Mode, Json5Mode);
  Mode.prototype.$id = "ace/mode/custom_json5";

  ace.define('ace/mode/custom_json5', [], function(require, exports, module) {
    exports.Mode = Mode;
  });
};
