"use strict";
exports.__esModule = true;
var ts = require("typescript");
var path = require("path");
var extend = require("deep-extend");
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
        if (ts.isVariableStatement(node) && isNodeExported(node)) {
            var nodeDeclarations = node.declarationList.declarations[0];
            if (nodeDeclarations.name.getText(node.getSourceFile()) !== "handler") {
                return;
            }
            var children = node.getChildren(sourceFile);
            var declaration = children.find(function (x) { return ts.isVariableDeclarationList(x); });
            if (!declaration) {
                return;
            }
            var syntaxList = declaration.getChildren().find(function (x) { return x.kind === ts.SyntaxKind.SyntaxList; });
            var variableDeclaration = syntaxList._children.find(function (x) { return ts.isVariableDeclaration(x); });
            if (!variableDeclaration) {
                return;
            }
            var arrowFunction = variableDeclaration.getChildren().find(function (x) { return ts.isArrowFunction(x); });
            if (!arrowFunction) {
                return;
            }
            foundNodes.push(processNode(typeChecker, file, arrowFunction));
        }
        else {
            unresolvedNodes.push(node);
        }
    });
    // Either print the found nodes, or offer a list of what identifiers were found
    if (!foundNodes.length) {
        console.log("Could not find '" + identifier + "' in " + file + ", found: " + unresolvedNodes.filter(function (f) { return f[0]; }).map(function (f) { return f[0]; }).join(", ") + ".");
        process.exitCode = 1;
    }
    else {
        foundNodes.map(function (f) {
            console.log(JSON.stringify(f, null, 4));
        });
    }
}
/** True if this is visible outside this file, false otherwise */
function isNodeExported(node) {
    return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile));
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
var _parsedAliases = new Set();
var typeParams = new Map();
function serialiseType(typeChecker, type) {
    var typeNodeSchema = {};
    if (ts.isTypeReferenceNode(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        if (typeReferenceShape.symbol) {
            if (type.typeArguments) {
                for (var _i = 0, _a = type.typeArguments; _i < _a.length; _i++) {
                    var typeNode = _a[_i];
                    extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
                }
            }
            var declarations = typeReferenceShape.symbol.getDeclarations();
            for (var _b = 0, declarations_1 = declarations; _b < declarations_1.length; _b++) {
                var declaration = declarations_1[_b];
                extend(typeNodeSchema, serialiseType(typeChecker, declaration));
            }
        }
        else if (typeReferenceShape.aliasSymbol) {
            for (var i = 0; i < typeReferenceShape.aliasSymbol.declarations.length; i++) {
                var declaration = typeReferenceShape.aliasSymbol.declarations[i];
                if (!_parsedAliases.has(declaration)) {
                    _parsedAliases.add(declaration);
                    if (type.typeArguments) {
                        if (ts.isTypeAliasDeclaration(declaration)) {
                            typeParams.set(typeChecker.getTypeAtLocation(declaration.typeParameters[i]).symbol, serialiseType(typeChecker, type.typeArguments[i]));
                        }
                    }
                    extend(typeNodeSchema, serialiseType(typeChecker, declaration));
                }
            }
        }
        else if (typeReferenceShape.aliasTypeArguments) {
            for (var _c = 0, _d = typeReferenceShape.aliasTypeArguments; _c < _d.length; _c++) {
                var aliasTypeArgument = _d[_c];
                for (var _e = 0, _f = aliasTypeArgument.symbol.declarations; _e < _f.length; _e++) {
                    var declaration = _f[_e];
                    extend(typeNodeSchema, serialiseType(typeChecker, declaration));
                }
            }
        }
    }
    else if (ts.isExpressionWithTypeArguments(type)) {
        if (type.typeArguments) {
            for (var _g = 0, _h = type.typeArguments; _g < _h.length; _g++) {
                var typeNode = _h[_g];
                extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
            }
        }
    }
    else if (ts.isIdentifier(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        var declarations = typeReferenceShape.symbol.getDeclarations();
        for (var _j = 0, declarations_2 = declarations; _j < declarations_2.length; _j++) {
            var declaration = declarations_2[_j];
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
        for (var _k = 0, _l = type.members; _k < _l.length; _k++) {
            var member = _l[_k];
            extend(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isInterfaceDeclaration(type)) {
        if (type.heritageClauses) {
            for (var _m = 0, _o = type.heritageClauses; _m < _o.length; _m++) {
                var heritage = _o[_m];
                for (var _p = 0, _q = heritage.types; _p < _q.length; _p++) {
                    var typeNode = _q[_p];
                    extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
                }
            }
        }
        for (var _r = 0, _s = type.members; _r < _s.length; _r++) {
            var member = _s[_r];
            extend(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isIndexedAccessTypeNode(type)) {
        return serialiseType(typeChecker, type.objectType);
    }
    else if (ts.isIntersectionTypeNode(type)) {
        for (var _t = 0, _u = type.types; _t < _u.length; _t++) {
            var typeNode = _u[_t];
            extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
        }
    }
    else if (ts.isTypeParameterDeclaration(type)) {
        // pass
        return typeParams.get(typeChecker.getTypeAtLocation(type).symbol);
    }
    else {
        return typeName(typeChecker, type);
    }
    // console.log(typeNodeSchema);
    if (Object.keys(typeNodeSchema).length) {
        return typeNodeSchema;
    }
    return undefined;
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
    // if (ts.isExpressionWithTypeArguments(node)) {
    //   return node.getText()
    // }
    // if (ts.isTypeOperatorNode(node)) {
    //   return node.getText()
    // }
    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return { type: "string" };
        case ts.SyntaxKind.BooleanKeyword:
            return { type: "boolean" };
        case ts.SyntaxKind.NumberKeyword:
            return { type: "number" };
        case ts.SyntaxKind.AnyKeyword:
            return { type: "any" };
        case ts.SyntaxKind.VoidKeyword:
            return { type: "void" };
        case ts.SyntaxKind.NullKeyword:
            return { type: "null" };
        case ts.SyntaxKind.UndefinedKeyword:
            return { type: "undefined" };
        case ts.SyntaxKind.NeverKeyword:
            return { type: "never" };
    }
    console.error("Type not handled:", node.kind, ts.SyntaxKind[node.kind], node.getText());
    return "";
}
// Run the extract function with the script's arguments
extract("./handlers/handler.inline.ts", "handler");
//extract("./handlers/handler.typeRef.ts", "handler");
