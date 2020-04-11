"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
        var name = "";
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
            console.log(JSON.stringify(arrowFunction.parameters.map(function (x) { return serialiseType(typeChecker, x.type); }), null, 4));
            // console.log({
            //     ...arrowFunction,
            //     parent: null
            // })
            //console.log(node.getChildren(sourceFile))
            // console.log(
            //     declaration
            // )
            // console.log({
            //     ...declaration,
            //     parent: null,
            // });
        }
        if (name === "handler") {
            foundNodes.push(processNode(typeChecker, file, node));
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
            console.log(f);
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
    console.log(__assign(__assign({}, node), { parent: null }));
    console.log(typeChecker.getSignatureFromDeclaration(node));
    return {
        path: path.relative(__dirname, path.join(__dirname, file)),
        summary: summary,
        description: description,
        pathParameters: {},
        queryStringParameters: {},
        returns: {}
    };
}
function serialiseType(typeChecker, type) {
    var typeNodeSchema = {};
    if (ts.isTypeReferenceNode(type) || ts.isExpressionWithTypeArguments(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        var declarations = typeReferenceShape.symbol.getDeclarations();
        for (var _i = 0, declarations_1 = declarations; _i < declarations_1.length; _i++) {
            var declaration = declarations_1[_i];
            extend(typeNodeSchema, serialiseType(typeChecker, declaration));
        }
        if (type.typeArguments) {
            for (var _a = 0, _b = type.typeArguments; _a < _b.length; _a++) {
                var typeNode = _b[_a];
                extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
            }
        }
        if (ts.isTypeReferenceNode(type) && type.members) {
            for (var _c = 0, _d = type.members; _c < _d.length; _c++) {
                var typeNode = _d[_c];
                extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
            }
        }
    }
    else if (ts.isIdentifier(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        var declarations = typeReferenceShape.symbol.getDeclarations();
        for (var _e = 0, declarations_2 = declarations; _e < declarations_2.length; _e++) {
            var declaration = declarations_2[_e];
            extend(typeNodeSchema, serialiseType(typeChecker, declaration));
        }
    }
    else if (ts.isPropertySignature(type)) {
        typeNodeSchema[type.name.getText()] = serialiseType(typeChecker, type.type);
    }
    else if (ts.isTypeLiteralNode(type)) {
        for (var _f = 0, _g = type.members; _f < _g.length; _f++) {
            var member = _g[_f];
            extend(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isInterfaceDeclaration(type)) {
        if (type.heritageClauses) {
            for (var _h = 0, _j = type.heritageClauses; _h < _j.length; _h++) {
                var heritage = _j[_h];
                for (var _k = 0, _l = heritage.types; _k < _l.length; _k++) {
                    var typeNode = _l[_k];
                    extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
                }
            }
        }
        for (var _m = 0, _o = type.members; _m < _o.length; _m++) {
            var member = _o[_m];
            extend(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isIndexedAccessTypeNode(type)) {
        return serialiseType(typeChecker, type.objectType);
        // const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        // const declarations = typeReferenceShape.symbol.getDeclarations();
        // for(const declaration of declarations) {
        //     extend(typeNodeSchema[type.indexType.getFullText()], serialiseType(typeChecker, declaration as unknown as ts.TypeNode))
        // }
        //return serialiseType(typeChecker, type.objectType)
    }
    else if (ts.isIntersectionTypeNode(type)) {
        for (var _p = 0, _q = type.types; _p < _q.length; _p++) {
            var typeNode = _q[_p];
            extend(typeNodeSchema, serialiseType(typeChecker, typeNode));
        }
    }
    else if (ts.isTypeParameterDeclaration(type)) {
        // console.log(type);
    }
    else {
        return typeName(type);
    }
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
function typeName(node) {
    if (!node) {
        return "";
    }
    if (ts.isArrayTypeNode(node)) {
        return "Array<" + typeName(node.elementType) + ">";
    }
    if (ts.isTupleTypeNode(node)) {
        return "[" + node.elementTypes.map(function (it) { return typeName(it); }) + "]";
    }
    if (ts.isUnionTypeNode(node)) {
        return node.types.map(typeName).join(" | ");
    }
    // if (ts.isTypeReferenceNode(node)) {
    //   let name = tokenName(node.typeName)
    //   if (node.typeArguments) {
    //     name += `<${node.typeArguments.map(it => typeName(it)).join(", ")}>`
    //   }
    //   return name
    // }
    if (ts.isFunctionTypeNode(node)) {
        return node.getText();
    }
    if (ts.isTypeLiteralNode(node) || ts.isLiteralTypeNode(node)) {
        return node.getText();
    }
    if (ts.isExpressionWithTypeArguments(node)) {
        return node.getText();
    }
    if (ts.isTypeOperatorNode(node)) {
        return node.getText();
    }
    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return "string";
        case ts.SyntaxKind.BooleanKeyword:
            return "boolean";
        case ts.SyntaxKind.NumberKeyword:
            return "number";
        case ts.SyntaxKind.AnyKeyword:
            return "any";
        case ts.SyntaxKind.VoidKeyword:
            return "void";
        case ts.SyntaxKind.NullKeyword:
            return "null";
        case ts.SyntaxKind.UndefinedKeyword:
            return "undefined";
        case ts.SyntaxKind.NeverKeyword:
            return "never";
    }
    console.error("Type not handled:", node.kind, ts.SyntaxKind[node.kind], node.getText());
    return "";
}
// Run the extract function with the script's arguments
extract("./handlers/handler.ts", "handler");
