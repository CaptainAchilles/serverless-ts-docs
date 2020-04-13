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
    // Traverse the tree until we find the jsdoc
    let jsDocNode: ts.Node = node;

    while (!(ts.isVariableStatement(jsDocNode) || ts.isFunctionDeclaration(jsDocNode))) {
        if (jsDocNode.parent) {
            jsDocNode = jsDocNode.parent
        } else {
            return "";
        }
    }

    if ((jsDocNode as any).jsDoc && (jsDocNode as any).jsDoc[0]) {
        return (jsDocNode as any).jsDoc[0].comment
    }

    const commentRanges = ts.getLeadingCommentRanges(jsDocNode.getSourceFile().getFullText(), jsDocNode.getFullStart())
    if (!commentRanges) {
        return "";
    }
    const comment = node.getSourceFile().getFullText().slice(commentRanges[0].pos, commentRanges[0].end)
    return comment;
}

export function processNode(typeChecker: ts.TypeChecker, file: string, node: ts.SignatureDeclaration): SchemaDoc {
    const [summary, description] = getFunctionComments(node).split("\n");
    if (!node.type) {
        throw new Error("Found function does not have a `type`: " + node.getFullText())
    }

    return {
        path: path.relative(__dirname, file),
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

const heritageTypeParams = new Map<ts.Symbol, ts.TypeNode>();
function serialiseType(typeChecker: ts.TypeChecker, type: ts.TypeNode): { [key: string]: any } | undefined {
    const typeNodeSchema: { [key: string]: any } = {};

    if (ts.isTypeReferenceNode(type)) {
        const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        const symbol = typeReferenceShape.symbol || typeReferenceShape.aliasSymbol
        const maybeTypeArguments = typeChecker.getTypeArguments(typeReferenceShape as ts.TypeReference);

        // TODO: There's gotta be a better way than keeping a global map...
        const typeArguments = (
            type.typeArguments ||
            (typeReferenceShape.aliasTypeArguments && typeReferenceShape.aliasTypeArguments.length ? typeReferenceShape.aliasTypeArguments[0].symbol.getDeclarations() : null) || 
            (maybeTypeArguments.length ? maybeTypeArguments[0].symbol.getDeclarations() : null)
        ) as ts.NodeArray<ts.TypeNode>
        if (symbol) {
            // if (typeArguments) {
            //     heritageTypeParams.set(symbol, typeArguments)
            // }
            const declarations = symbol.getDeclarations();
            if (declarations) {
                for (let i = 0; i < declarations.length; i++) {
                    const declaration = declarations[i];
                    if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                        if (typeArguments && declaration.typeParameters) {
                            for (let j = 0; j < declaration.typeParameters.length; j++) {
                                heritageTypeParams.set(typeChecker.getTypeAtLocation(declaration.typeParameters[j]).symbol, typeArguments[j])
                            }
                        }
                    } else if (typeArguments) {
                        for (let j = 0; j < typeArguments.length; j++) {
                            heritageTypeParams.set(typeChecker.getTypeAtLocation(declaration).symbol, typeArguments[j]);
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
        const result = serialiseType(typeChecker, type.type as ts.TypeNode);
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
        typeNodeSchema["type"] = "object"
        typeNodeSchema["properties"] = {}
        for (const member of type.members) {
            extend(typeNodeSchema["properties"], serialiseType(typeChecker, member as unknown as ts.TypeNode))
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
            (type.parent as any)
        ]
        for (const path of order) {
            const exists = heritageTypeParams.get(typeChecker.getTypeAtLocation(path).symbol)
            if (exists) {
                return serialiseType(typeChecker, exists);
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
        return serialiseType(typeChecker, node)
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
        const allArePrimitive = node.types.every(x => ts.isLiteralTypeNode(x))
        const mappedTypes = node.types.map(type => typeName(typeChecker, type))
        const allHaveSameType = mappedTypes.every(x => x.type === mappedTypes[0].type)
        if (allArePrimitive && allHaveSameType) {
            return {
                type: mappedTypes[0].type,
                enum: node.types.flatMap(type => typeName(typeChecker, type).enum)
            }
        }

        return {
            $oneOf: node.types.map(type => typeName(typeChecker, type))
        }
    }

    if (ts.isLiteralTypeNode(node)) {
        const isBoolean = [ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.BooleanKeyword].includes(node.literal.kind)
        if (isBoolean) {
            return {
                type: "boolean",
                enum: [node.getText() === "false" ? false : true]
            }
        } else if ([ts.SyntaxKind.NumericLiteral].includes(node.literal.kind)) {
            return {
                type: "number",
                enum: [+node.getText().replace(/"/gi, "")]
            }
        }
        
        return {
            type: "string",
            enum: [node.getText().replace(/"/gi, "")]
        }
    }

    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return { type: "string" }
        case ts.SyntaxKind.BooleanKeyword:
            return { type: "boolean", enum: [true, false] };
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