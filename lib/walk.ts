import * as ts from "typescript";
import * as path from "path";
import extend from "deep-extend";

type OpenAPIShape =
    { [key: string]: string | boolean | number | OpenAPIShape } | undefined

export interface SchemaDoc {
    path: string;
    summary: string;
    description: string;
    inputType: OpenAPIShape[],
    returns: OpenAPIShape,
}

function getFunctionComments(node: ts.SignatureDeclaration): string {
    const jsDocTags = ts.getJSDocTags(node);
    return (jsDocTags[0].parent as any).comment
}

export function processNode(typeChecker: ts.TypeChecker, file: string, node: ts.SignatureDeclaration): SchemaDoc {
    const [summary, description] = getFunctionComments(node).split("\n");
    if (!node.type) {
        throw new Error("Found function does not have a `type`: " + node.getFullText())
    }

    return {
        path: path.relative(__dirname, path.join(__dirname, file)),
        summary,
        description,
        inputType: node.parameters.map(param => {
            if (!param.type) {
                throw new Error("Node parameter does not have a `type`: " + param.getFullText())
            }
            return serialiseType(typeChecker, param.type)
        }),
        returns: serialiseType(typeChecker, node.type)
    }
}

const heritageTypeParams = new Map<ts.Symbol, ts.NodeArray<ts.TypeNode>>();
function serialiseType(typeChecker: ts.TypeChecker, type: ts.TypeNode): { [key: string]: any } | undefined {
    const typeNodeSchema: { [key: string]: any } = {};

    if (ts.isTypeReferenceNode(type)) {
        const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        const symbol = typeReferenceShape.symbol || typeReferenceShape.aliasSymbol
        if (symbol) {
            if (type.typeArguments) {
                heritageTypeParams.set(symbol, type.typeArguments)
            }
            const declarations = symbol.getDeclarations();
            if (declarations) {
                for (let i = 0; i < declarations.length; i++) {
                    const declaration = declarations[i];
                    if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                        if (type.typeArguments && declaration.typeParameters) {
                            for (const typeParam of declaration.typeParameters) {
                                heritageTypeParams.set(typeChecker.getTypeAtLocation(typeParam).symbol, type.typeArguments)
                            }
                        }
                    }
                    extend(typeNodeSchema, serialiseType(typeChecker, declaration as unknown as ts.TypeNode))
                }
            }
        }
    } else if (ts.isExpressionWithTypeArguments(type)) {
        if (type.typeArguments) {
            for (const typeNode of type.typeArguments) {
                extend(typeNodeSchema, serialiseType(typeChecker, typeNode))
            }
        }
    }
    else if (ts.isIdentifier(type)) {
        const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        const declarations = typeReferenceShape.symbol.getDeclarations();
        if (declarations) {
            for (const declaration of declarations) {
                extend(typeNodeSchema, serialiseType(typeChecker, declaration as unknown as ts.TypeNode))
            }
        }
    } else if (ts.isTypeAliasDeclaration(type)) {
        extend(typeNodeSchema, serialiseType(typeChecker, type.type as ts.TypeNode));
    } else if (ts.isPropertySignature(type)) {
        typeNodeSchema[type.name.getText()] = serialiseType(typeChecker, type.type as ts.TypeNode)
    }
    else if (ts.isTypeLiteralNode(type)) {
        for (const member of type.members) {
            extend(typeNodeSchema, serialiseType(typeChecker, member as unknown as ts.TypeNode))
        }
    } else if (ts.isInterfaceDeclaration(type)) {
        if (type.heritageClauses) {
            for (const heritage of type.heritageClauses) {
                for (const typeNode of heritage.types) {
                    extend(typeNodeSchema, serialiseType(typeChecker, typeNode as ts.TypeNode))
                }
            }
        }
        for (const member of type.members) {
            extend(typeNodeSchema, serialiseType(typeChecker, member as any))
        }
    } else if (ts.isIndexedAccessTypeNode(type)) {
        return serialiseType(typeChecker, type.objectType)
    } else if (ts.isIntersectionTypeNode(type)) {
        for (const typeNode of type.types) {
            extend(typeNodeSchema, serialiseType(typeChecker, typeNode))
        }
    } else if (ts.isTypeParameterDeclaration(type)) {
        // Run up the chain until we find the heritage parameter
        const order = [
            type,
            (type.parent as any).type
        ]
        for (const path of order) {
            const exists = heritageTypeParams.get(typeChecker.getTypeAtLocation(path).symbol)
            if (exists) {
                return serialiseType(typeChecker, exists[0]);
            }
        }

    } else {
        return typeName(typeChecker, type);
    }

    if (Object.keys(typeNodeSchema).length) {
        return typeNodeSchema;
    }
    return undefined
}

function typeName(typeChecker: ts.TypeChecker, node: ts.TypeNode): any {
    if (ts.isTypeReferenceNode(node) || ts.isTypeLiteralNode(node)) {
        return {
            type: "object",
            properties: serialiseType(typeChecker, node)
        }
    }

    if (ts.isArrayTypeNode(node)) {
        return {
            type: "array",
            items: {
                type: node.elementType
            }
        }
    }

    if (ts.isUnionTypeNode(node)) {
        return {
            $oneOf: node.types.map(type => typeName(typeChecker, type))
        }
    }

    if (ts.isLiteralTypeNode(node)) {
        const isBoolean = [ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.BooleanKeyword].includes(node.literal.kind)
        return {
            type: isBoolean ? "boolean" : "string",
            enum: [isBoolean ? (node.getText() === "false" ? false : true) : node.getText()]
        }
    }

    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return { type: "string" }
        case ts.SyntaxKind.BooleanKeyword:
            return { type: "boolean" }
        case ts.SyntaxKind.NumberKeyword:
            return { type: "number" }
        case ts.SyntaxKind.AnyKeyword:
            return { type: "any" }
        case ts.SyntaxKind.NullKeyword:
            return { type: "null" }
        case ts.SyntaxKind.VoidKeyword:
        case ts.SyntaxKind.UndefinedKeyword:
        case ts.SyntaxKind.NeverKeyword:
            // Omit the key
            return undefined
    }

    console.error("Type not handled:", node.kind, ts.SyntaxKind[node.kind], node.getText())
    return ""
}