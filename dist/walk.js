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
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
const deep_extend_1 = __importDefault(require("deep-extend"));
function getFunctionComments(node) {
    // Traverse the tree until we find the jsdoc
    let jsDocNode = node;
    while (!(ts.isVariableStatement(jsDocNode) || ts.isFunctionDeclaration(jsDocNode))) {
        if (jsDocNode.parent) {
            jsDocNode = jsDocNode.parent;
        }
        else {
            return "";
        }
    }
    if (jsDocNode.jsDoc && jsDocNode.jsDoc[0]) {
        return jsDocNode.jsDoc[0].comment;
    }
    const commentRanges = ts.getLeadingCommentRanges(jsDocNode.getSourceFile().getFullText(), jsDocNode.getFullStart());
    if (!commentRanges) {
        return "";
    }
    const comment = node.getSourceFile().getFullText().slice(commentRanges[0].pos, commentRanges[0].end);
    return comment;
}
function processNode(typeChecker, file, node) {
    const [summary, description] = getFunctionComments(node).split("\n");
    if (!node.type) {
        throw new Error("Found function does not have a `type`: " + node.getFullText());
    }
    return {
        path: path.relative(__dirname, file),
        summary,
        description,
        inputType: node.parameters.map(param => {
            if (!param.type) {
                throw new Error("Node parameter does not have a `type`: " + param.getFullText());
            }
            return serialiseType(typeChecker, param.type);
        }),
        returns: serialiseType(typeChecker, node.type)
    };
}
exports.processNode = processNode;
const heritageTypeParams = new Map();
function serialiseType(typeChecker, type) {
    const typeNodeSchema = {};
    if (ts.isTypeReferenceNode(type)) {
        const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        const symbol = typeReferenceShape.symbol || typeReferenceShape.aliasSymbol;
        if (symbol) {
            if (type.typeArguments) {
                heritageTypeParams.set(symbol, type.typeArguments);
            }
            const declarations = symbol.getDeclarations();
            if (declarations) {
                for (let i = 0; i < declarations.length; i++) {
                    const declaration = declarations[i];
                    if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                        if (type.typeArguments && declaration.typeParameters) {
                            for (const typeParam of declaration.typeParameters) {
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
            for (const typeNode of type.typeArguments) {
                deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode));
            }
        }
    }
    else if (ts.isIdentifier(type)) {
        const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        const declarations = typeReferenceShape.symbol.getDeclarations();
        if (declarations) {
            for (const declaration of declarations) {
                deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, declaration));
            }
        }
    }
    else if (ts.isTypeAliasDeclaration(type)) {
        deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, type.type));
    }
    else if (ts.isPropertySignature(type)) {
        const result = serialiseType(typeChecker, type.type);
        // if (ts.isTypeLiteralNode(type.type as ts.TypeNode)) {
        //     typeNodeSchema[type.name.getText().replace(/"/gi, "")] = {
        //         type: "object",
        //         properties: result
        //     }
        // } else {
        typeNodeSchema[type.name.getText().replace(/"/gi, "")] = result;
        // }
    }
    else if (ts.isTypeLiteralNode(type)) {
        typeNodeSchema["type"] = "object";
        typeNodeSchema["properties"] = {};
        for (const member of type.members) {
            deep_extend_1.default(typeNodeSchema["properties"], serialiseType(typeChecker, member));
        }
    }
    else if (ts.isInterfaceDeclaration(type)) {
        if (type.heritageClauses) {
            for (const heritage of type.heritageClauses) {
                for (const typeNode of heritage.types) {
                    deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode));
                }
            }
        }
        for (const member of type.members) {
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, member));
        }
    }
    else if (ts.isIndexedAccessTypeNode(type)) {
        return serialiseType(typeChecker, type.objectType);
    }
    else if (ts.isIntersectionTypeNode(type)) {
        for (const typeNode of type.types) {
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode));
        }
    }
    else if (ts.isTypeParameterDeclaration(type)) {
        // Run up the chain until we find the heritage parameter
        const order = [
            type,
            type.parent.type
        ];
        for (const path of order) {
            const exists = heritageTypeParams.get(typeChecker.getTypeAtLocation(path).symbol);
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
        return serialiseType(typeChecker, node);
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
        const allArePrimitive = node.types.every(x => ts.isLiteralTypeNode(x));
        const mappedTypes = node.types.map(type => typeName(typeChecker, type));
        const allHaveSameType = mappedTypes.every(x => x.type === mappedTypes[0].type);
        if (allArePrimitive && allHaveSameType) {
            return {
                type: mappedTypes[0].type,
                enum: node.types.flatMap(type => typeName(typeChecker, type).enum)
            };
        }
        return {
            $oneOf: node.types.map(type => typeName(typeChecker, type))
        };
    }
    if (ts.isLiteralTypeNode(node)) {
        const isBoolean = [ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.BooleanKeyword].includes(node.literal.kind);
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
