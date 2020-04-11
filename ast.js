"use strict";
exports.__esModule = true;
var ts = require("typescript");
var path = require("path");
var extend = require("deep-extend");
/** True if this is visible outside this file, false otherwise */
function isNodeExported(node) {
    return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0
    //|| (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
}
function matches(node, identifier) {
    if (!isNodeExported(node)) {
        return undefined;
    }
    if (ts.isFunctionDeclaration(node)
        && node.name.text.trim() === identifier) {
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
    // Init the type checker
    var typeChecker = program.getTypeChecker();
    // To give constructive error messages, keep track of found and un-found identifiers
    var unresolvedNodes = [];
    var foundNodes = [];
    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, function (node) {
        var found = matches(node, identifier);
        if (found) {
            foundNodes.push(processNode(typeChecker, file, found));
        }
        else {
            findExportHandler(node, identifier, function (exportHandler) {
                foundNodes.push(processNode(typeChecker, file, exportHandler));
            });
        }
    });
    // Either print the found nodes, or offer a list of what identifiers were found
    if (!foundNodes.length) {
        console.log("Could not find '" + identifier + "' in " + file + ", found: " + unresolvedNodes.filter(function (f) { return f[0]; }).map(function (f) { return f[0]; }).join(", ") + ". (Have your exported a '" + identifier + "' function?)");
        process.exitCode = 1;
    }
    else {
        foundNodes.map(function (f) {
            console.log(JSON.stringify(f, null, 4));
        });
    }
}
function getFunctionComments(node) {
    // const [commentRange] = ts.getLeadingCommentRanges(node.getSourceFile().getFullText(), node.getFullStart())
    // const comment = node.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end)
    // console.log(comment)
    //console.log((node as any).jsDoc[0].comment)
    var jsDocTags = ts.getJSDocTags(node);
    return jsDocTags[0].parent.comment;
    // console.log((jsDocTags[0].parent as any).comment);
}
function processNode(typeChecker, file, node) {
    var _a = getFunctionComments(node).split("\n"), summary = _a[0], description = _a[1];
    return {
        path: path.relative(__dirname, path.join(__dirname, file)),
        summary: summary,
        description: description,
        inputType: node.parameters.map(function (param) { return serialiseType(typeChecker, param.type); }),
        returns: serialiseType(typeChecker, node.type)
    };
}
var heritageTypeParams = new Map();
function serialiseType(typeChecker, type) {
    var typeNodeSchema = {};
    if (ts.isTypeReferenceNode(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        var symbol = typeReferenceShape.symbol || typeReferenceShape.aliasSymbol;
        if (symbol) {
            if (type.typeArguments) {
                heritageTypeParams.set(symbol, type.typeArguments);
            }
            var declarations = symbol.getDeclarations();
            for (var i = 0; i < declarations.length; i++) {
                var declaration = declarations[i];
                if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                    if (type.typeArguments) {
                        for (var _i = 0, _a = declaration.typeParameters; _i < _a.length; _i++) {
                            var typeParam = _a[_i];
                            heritageTypeParams.set(typeChecker.getTypeAtLocation(typeParam).symbol, type.typeArguments);
                        }
                    }
                }
                extend(typeNodeSchema, serialiseType(typeChecker, declaration));
            }
        }
    }
    else if (ts.isExpressionWithTypeArguments(type)) {
        if (type.typeArguments) {
            for (var _b = 0, _c = type.typeArguments; _b < _c.length; _b++) {
                var typeNode = _c[_b];
                extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
            }
        }
    }
    else if (ts.isIdentifier(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        var declarations = typeReferenceShape.symbol.getDeclarations();
        for (var _d = 0, declarations_1 = declarations; _d < declarations_1.length; _d++) {
            var declaration = declarations_1[_d];
            extend(typeNodeSchema, serialiseType(typeChecker, declaration));
        }
    }
    else if (ts.isTypeAliasDeclaration(type)) {
        extend(typeNodeSchema, serialiseType(typeChecker, type.type));
    }
    else if (ts.isPropertySignature(type)) {
        typeNodeSchema[type.name.getText()] = serialiseType(typeChecker, type.type);
    }
    else if (ts.isTypeLiteralNode(type)) {
        for (var _e = 0, _f = type.members; _e < _f.length; _e++) {
            var member = _f[_e];
            extend(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isInterfaceDeclaration(type)) {
        if (type.heritageClauses) {
            for (var _g = 0, _h = type.heritageClauses; _g < _h.length; _g++) {
                var heritage = _h[_g];
                for (var _j = 0, _k = heritage.types; _j < _k.length; _j++) {
                    var typeNode = _k[_j];
                    extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
                }
            }
        }
        for (var _l = 0, _m = type.members; _l < _m.length; _l++) {
            var member = _m[_l];
            extend(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isIndexedAccessTypeNode(type)) {
        return serialiseType(typeChecker, type.objectType);
    }
    else if (ts.isIntersectionTypeNode(type)) {
        for (var _o = 0, _p = type.types; _o < _p.length; _o++) {
            var typeNode = _p[_o];
            extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
        }
    }
    else if (ts.isTypeParameterDeclaration(type)) {
        // Run up the chain until we find the heritage parameter
        var order = [
            type,
            type.parent.type
        ];
        for (var _q = 0, order_1 = order; _q < order_1.length; _q++) {
            var path_1 = order_1[_q];
            var exists = heritageTypeParams.get(typeChecker.getTypeAtLocation(path_1).symbol);
            if (exists) {
                return serialiseType(typeChecker, exists[0]);
            }
        }
    }
    else {
        return typeName(typeChecker, type);
    }
    if (Object.keys(typeNodeSchema).length) {
        return typeNodeSchema;
    }
    return undefined;
}
function typeName(typeChecker, node) {
    if (ts.isTypeReferenceNode(node) || ts.isTypeLiteralNode(node)) {
        return {
            type: "object",
            properties: serialiseType(typeChecker, node)
        };
    }
    if (ts.isArrayTypeNode(node)) {
        return {
            type: "array",
            items: {
                type: node.elementType
            }
        };
    }
    if (ts.isUnionTypeNode(node)) {
        return {
            $oneOf: node.types.map(function (type) { return typeName(typeChecker, type); })
        };
    }
    if (ts.isLiteralTypeNode(node)) {
        var isBoolean = [ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.BooleanKeyword].includes(node.literal.kind);
        return {
            type: isBoolean ? "boolean" : "string",
            "enum": [isBoolean ? (node.getText() === "false" ? false : true) : node.getText()]
        };
    }
    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return { type: "string" };
        case ts.SyntaxKind.BooleanKeyword:
            return { type: "boolean" };
        case ts.SyntaxKind.NumberKeyword:
            return { type: "number" };
        case ts.SyntaxKind.AnyKeyword:
            return { type: "any" };
        case ts.SyntaxKind.NullKeyword:
            return { type: "null" };
        case ts.SyntaxKind.VoidKeyword:
        case ts.SyntaxKind.UndefinedKeyword:
        case ts.SyntaxKind.NeverKeyword:
            // Omit the key
            return undefined;
    }
    console.error("Type not handled:", node.kind, ts.SyntaxKind[node.kind], node.getText());
    return "";
}
// Run the extract function with the script's arguments
extract("./handlers/handler.inline.ts", "handler");
//extract("./handlers/handler.typeRef.ts", "handler");
extract("./handlers/handler.separate.export.ts", "handler");
//extract("./handlers/handler.function.ts", "handler");
