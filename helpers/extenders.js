// Ajout d'une fonction decodeHTML
String.prototype.decodeHTML = function() {
    const map = { gt: ">" /* , … */ };
    return this.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gi, function($0, $1) {
        if ($1[0] === "#") {
            return String.fromCharCode(
                $1[1].toLowerCase() === "x"
                    ? parseInt($1.substr(2), 16)
                    : parseInt($1.substr(1), 10)
            );
        } else {
            return map.hasOwnProperty($1) ? map[$1] : $0;
        }
    });
};

// Ajout d'une propriété process.options
const commandLineArgs = require("command-line-args");
const optionDefinitions = [
    { name: "no-run-start", alias: "n", type: String, multiple: true },
    { name: "run-tasks", alias: "r", type: String, multiple: true }
];
process.options = commandLineArgs(optionDefinitions);
