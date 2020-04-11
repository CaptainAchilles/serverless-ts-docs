"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = __importStar(require("typescript"));
var path = __importStar(require("path"));
var deep_extend_1 = __importDefault(require("deep-extend"));
function getFunctionComments(node) {
    var jsDocTags = ts.getJSDocTags(node);
    return jsDocTags[0].parent.comment;
}
function processNode(typeChecker, file, node) {
    var _a = getFunctionComments(node).split("\n"), summary = _a[0], description = _a[1];
    if (!node.type) {
        throw new Error("Found function does not have a `type`: " + node.getFullText());
    }
    return {
        path: path.relative(__dirname, path.join(__dirname, file)),
        summary: summary,
        description: description,
        inputType: node.parameters.map(function (param) {
            if (!param.type) {
                throw new Error("Node parameter does not have a `type`: " + param.getFullText());
            }
            return serialiseType(typeChecker, param.type);
        }),
        returns: serialiseType(typeChecker, node.type)
    };
}
exports.processNode = processNode;
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
            if (declarations) {
                for (var i = 0; i < declarations.length; i++) {
                    var declaration = declarations[i];
                    if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                        if (type.typeArguments && declaration.typeParameters) {
                            for (var _i = 0, _a = declaration.typeParameters; _i < _a.length; _i++) {
                                var typeParam = _a[_i];
                                heritageTypeParams.set(typeChecker.getTypeAtLocation(typeParam).symbol, type.typeArguments);
                            }
                        }
                    }
                    deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, declaration));
                }
            }
        }
    }
    else if (ts.isExpressionWithTypeArguments(type)) {
        if (type.typeArguments) {
            for (var _b = 0, _c = type.typeArguments; _b < _c.length; _b++) {
                var typeNode = _c[_b];
                deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode));
            }
        }
    }
    else if (ts.isIdentifier(type)) {
        var typeReferenceShape = typeChecker.getTypeAtLocation(type);
        var declarations = typeReferenceShape.symbol.getDeclarations();
        if (declarations) {
            for (var _d = 0, declarations_1 = declarations; _d < declarations_1.length; _d++) {
                var declaration = declarations_1[_d];
                deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, declaration));
            }
        }
    }
    else if (ts.isTypeAliasDeclaration(type)) {
        deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, type.type));
    }
    else if (ts.isPropertySignature(type)) {
        typeNodeSchema[type.name.getText()] = serialiseType(typeChecker, type.type);
    }
    else if (ts.isTypeLiteralNode(type)) {
        for (var _e = 0, _f = type.members; _e < _f.length; _e++) {
            var member = _f[_e];
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isInterfaceDeclaration(type)) {
        if (type.heritageClauses) {
            for (var _g = 0, _h = type.heritageClauses; _g < _h.length; _g++) {
                var heritage = _h[_g];
                for (var _j = 0, _k = heritage.types; _j < _k.length; _j++) {
                    var typeNode = _k[_j];
                    deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode));
                }
            }
        }
        for (var _l = 0, _m = type.members; _l < _m.length; _l++) {
            var member = _m[_l];
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isIndexedAccessTypeNode(type)) {
        return serialiseType(typeChecker, type.objectType);
    }
    else if (ts.isIntersectionTypeNode(type)) {
        for (var _o = 0, _p = type.types; _o < _p.length; _o++) {
            var typeNode = _p[_o];
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode));
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
            enum: [isBoolean ? (node.getText() === "false" ? false : true) : node.getText()]
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
