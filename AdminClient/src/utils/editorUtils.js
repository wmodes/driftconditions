// editorUtils.js

import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-json'; // Import base mode if extending from it
const langTools = ace.require("ace/ext/language_tools");

// Define Custom Highlight Rules
export const defineCustomHighlightRules = () => {
  const oop = ace.require("ace/lib/oop");
  const TextHighlightRules = ace.require("ace/mode/text_highlight_rules").TextHighlightRules;

  let CustomHighlightRules = function() {
    this.$rules = {
      start: [
        {
          token: "quoted-string", // Apply string styling
          // Matches single-quoted strings, allowing escaped characters
          regex: /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/,
          next: "start" // Return to start state after matching a string
        },
        { 
          regex: "\\btrack\\b",
          token: "editor-highlight-track",  
        },
        { 
          regex: "\\bclips\\b",
          token: "editor-highlight-clip", 
        }
      ]
    };
    this.normalizeRules();
  };

  oop.inherits(CustomHighlightRules, TextHighlightRules);
  return CustomHighlightRules;
};

// Define Custom Mode
export const defineCustomEditorMode = () => {
  const oop = ace.require("ace/lib/oop");
  const TextMode = ace.require("ace/mode/text").Mode;
  const CustomHighlightRules = defineCustomHighlightRules();

  let Mode = function() {
    this.HighlightRules = CustomHighlightRules;
  };

  oop.inherits(Mode, TextMode);

  (function() {
    // Additional mode setup if needed
    this.$id = "ace/mode/custom_json"; // Ensure this ID matches what you use in your component
  }).call(Mode.prototype);

  ace.define('ace/mode/custom_json', [], function(require, exports, module) {
    exports.Mode = Mode;
  });
};