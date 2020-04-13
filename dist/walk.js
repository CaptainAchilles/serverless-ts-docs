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
            return serialiseType(typeChecker, param.type, new Map());
        }),
        // returns: serialiseType(typeChecker, node.type, new Map())
    };
}

exports.processNode = processNode;
function serialiseType(typeChecker, node, genericArgs) {
    const typeNodeSchema = {};
    const type = typeChecker.getTypeAtLocation(node);
    if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
        const identifier = node.getChildren().find(x => ts.isIdentifier(x));
        const typeArguments = node.typeArguments;
        const symbol = type.aliasSymbol || type.symbol;
        if (symbol) {
            const typeDeclaration = symbol.declarations[0];
            if (ts.isTypeAliasDeclaration(typeDeclaration) || ts.isInterfaceDeclaration(typeDeclaration)) {
                const localMembers = typeDeclaration.typeParameters;
                if (typeArguments && localMembers && typeArguments.length === localMembers.length) {
                    for (let i = 0; i < typeArguments.length; i++) {
                        genericArgs.set(localMembers[i], typeArguments[i]);
                    }
                }
            }
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, identifier, genericArgs));
        }
    }
    else if (ts.isIdentifier(node)) {
        // Get the node type declaration
        for (const declaration of (type.aliasSymbol || type.symbol).declarations) {
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, declaration, genericArgs));
        }
    }
    else if (ts.isTypeAliasDeclaration(node)) {
        deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, node.type, genericArgs));
    }
    else if (ts.isUnionTypeNode(node)) {
        // LiteralType is a primitive, TypeLiteral is an {} shape
        const allArePrimitive = node.types.every(x => ts.isLiteralTypeNode(x));
        const mappedTypes = node.types.map(nodeType => serialiseType(typeChecker, nodeType, genericArgs));
        const allHaveSameType = mappedTypes.every(x => x.type === mappedTypes[0].type);
        if (allArePrimitive && allHaveSameType) {
            return {
                type: mappedTypes[0].type,
                enum: mappedTypes[0].enum
            };
        }
        return {
            $oneOf: mappedTypes
        };
    }
    else if (ts.isLiteralTypeNode(node)) {
        const isBoolean = [ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.BooleanKeyword].includes(node.literal.kind);
        if (isBoolean) {
            return {
                type: "boolean",
                enum: [node.getText() === "false" ? false : true]
            };
        }
        else if ([ts.SyntaxKind.NumericLiteral].includes(node.literal.kind)) {
            return {
                type: "number",
                enum: [+node.getText().replace(/"/gi, "")]
            };
        }
        return {
            type: "string",
            enum: [node.getText().replace(/"/gi, "")]
        };
    }
    else if (ts.isInterfaceDeclaration(node)) {
        // typeNodeSchema["type"] = "object";
        // typeNodeSchema["properties"] = {};
        if (node.heritageClauses) {
            // Walk the heritage clauses (interface x *extends {}*)
            for (const property of node.heritageClauses) {
                deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, property, genericArgs));
            }
        } else {
            for (const property of node.members) {
                deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, property, genericArgs));
            }
        }

        if (!typeNodeSchema.type) {
            return {
                type: "object",
                properties: typeNodeSchema
            };
        }
    } else if (ts.isTypeLiteralNode(node)) {
        typeNodeSchema["type"] = "object";
        typeNodeSchema["properties"] = {};
        for (const property of node.members) {
            deep_extend_1.default(typeNodeSchema["properties"], serialiseType(typeChecker, property, genericArgs));
        }
    }
    else if (ts.isHeritageClause(node)) {
        for (const property of node.types) {
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, property, genericArgs));
        }
    }
    else if (ts.isIntersectionTypeNode(node)) {
        for (const typeNode of node.types) {
            deep_extend_1.default(typeNodeSchema, serialiseType(typeChecker, typeNode, genericArgs));
        }
    }
    else if (ts.isPropertySignature(node)) {
        typeNodeSchema[node.name.getText().replace(/"/gi, "")] = serialiseType(typeChecker, node.type, genericArgs);
    }
    else if (ts.isTypeParameterDeclaration(node)) {
        return serialiseType(typeChecker, genericArgs.get(node), genericArgs);
    }
    else if (ts.isIndexedAccessTypeNode(node)) {
        const lookupKey = serialiseType(typeChecker, node.indexType, genericArgs);
        const resultingObject = serialiseType(typeChecker, node.objectType, genericArgs);
        return resultingObject.properties[lookupKey.enum[0]];
    }
    else {
        switch (node.kind) {
            case ts.SyntaxKind.StringKeyword:
                return { type: "string" };
            case ts.SyntaxKind.BooleanKeyword:
                return { type: "boolean", enum: [true, false] };
            case ts.SyntaxKind.NumberKeyword:
                return { type: "number" };
            case ts.SyntaxKind.AnyKeyword:
                return { type: "any" };
            case ts.SyntaxKind.NullKeyword:
                return { type: "null" };
            default:
                console.error("Type not handled:", node.kind, ts.SyntaxKind[node.kind], node.getText());
        }
    }
    if (Object.keys(typeNodeSchema).length) {
        return typeNodeSchema;
    }
    return undefined;
}
