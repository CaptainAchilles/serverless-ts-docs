"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = __importStar(require("typescript"));
var walk_1 = require("./walk");
/** This doesn't work when something is exported separate to it's declaration */
function isNodeExported(node) {
    return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile));
}
function matches(node, identifier) {
    if (!isNodeExported(node)) {
        return undefined;
    }
    if (ts.isFunctionDeclaration(node)
        && node.name &&
        node.name.text.trim() === identifier) {
        return node;
    }
    else if (ts.isVariableDeclaration(node) &&
        node.name.getFullText().trim() === identifier) {
        var found = node.getChildren().find(function (x) { return ts.isArrowFunction(x); });
        if (found) {
            return found;
        }
        return undefined;
    }
}
function findExportHandler(parent, identifier, done) {
    parent.forEachChild(function (node) {
        var found = matches(node, identifier);
        found ? done(found) : findExportHandler(node, identifier, done);
    });
}
/**
 * Prints out particular nodes from a source file
 *
 * @param file a path to a file
 * @param identifier top level identifiers available
 */
function extract(file, identifier) {
    // Create a Program to represent the project, then pull out the
    // source file to parse its AST.
    var program = ts.createProgram([file], {
        allowJs: true
    });
    var sourceFile = program.getSourceFile(file);
    if (!sourceFile) {
        throw new Error("Failed to load the file");
    }
    // Init the type checker
    var typeChecker = program.getTypeChecker();
    var foundNodes = [];
    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, function (node) {
        var found = matches(node, identifier);
        if (found) {
            foundNodes.push(walk_1.processNode(typeChecker, file, found));
        }
        else {
            findExportHandler(node, identifier, function (exportHandler) {
                foundNodes.push(walk_1.processNode(typeChecker, file, exportHandler));
            });
        }
    });
    // Either print the found nodes, or offer a list of what identifiers were found
    if (!foundNodes.length) {
        console.log("Could not find '" + identifier + "' in " + file + ". (Have your exported a '" + identifier + "' function?)");
        process.exitCode = 1;
    }
    else {
        foundNodes.map(function (f) {
            console.log(JSON.stringify(f, null, 4));
        });
    }
}
if (require.main === module) {
    if (process.argv.length < 3 || process.argv.length > 4) {
        console.log("Usage: " + process.argv[0] + " fileName exportFunction");
        process.exit(1);
    }

    const lastTwoArgs = process.argv.slice(process.argv.length - 2)
    extract(lastTwoArgs[0], lastTwoArgs[1]);
}
