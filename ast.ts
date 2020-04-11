import * as ts from "typescript";
import * as path from "path";
import * as extend from "deep-extend";

/** This doesn't work when something is exported separate to it's declaration */
function isNodeExported(node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
}

function matches(node: ts.Node, identifier: string): ts.ArrowFunction | ts.FunctionDeclaration | undefined {
    if (!isNodeExported(node)) {
        return undefined;
    }

    if (ts.isFunctionDeclaration(node)
        && node.name.text.trim() === identifier) {
        return node;
    } else if (
        ts.isVariableDeclaration(node) &&
        node.name.getFullText().trim() === identifier) {
            const found = node.getChildren().find(x => ts.isArrowFunction(x)) as ts.ArrowFunction;
            if (found) {
                return found
            }
            return undefined
    }
}

function findExportHandler(parent: ts.Node, identifier: string, done) {
    parent.forEachChild((node: any) => {
        const found = matches(node, identifier);
        found ? done(found) : findExportHandler(node, identifier, done)
    })
}

/**
 * Prints out particular nodes from a source file
 * 
 * @param file a path to a file
 * @param identifier top level identifiers available
 */
function extract(file: string, identifier: string): void {
    // Create a Program to represent the project, then pull out the
    // source file to parse its AST.
    let program = ts.createProgram([file], {
        allowJs: true
    });
    const sourceFile = program.getSourceFile(file);

    // Init the type checker
    const typeChecker = program.getTypeChecker();

    // To give constructive error messages, keep track of found and un-found identifiers
    const unresolvedNodes = [];
    const foundNodes = [];

    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, node => {
        const found = matches(node, identifier)
        if (found) {
            foundNodes.push(
                processNode(typeChecker, file, found)
            )
        } else {
            findExportHandler(node, identifier, exportHandler => {
                foundNodes.push(
                    processNode(typeChecker, file, exportHandler)
                )
            })
        }
        
    });

    // Either print the found nodes, or offer a list of what identifiers were found
    if (!foundNodes.length) {
        console.log(`Could not find '${identifier}' in ${file}, found: ${unresolvedNodes.filter(f => f[0]).map(f => f[0]).join(", ")}. (Have your exported a '${identifier}' function?)`);
        process.exitCode = 1;
    } else {
        foundNodes.map(f => {
            console.log(JSON.stringify(f, null, 4))
        });
    }
}

function getFunctionComments(node: ts.SignatureDeclaration): string {
    // const [commentRange] = ts.getLeadingCommentRanges(node.getSourceFile().getFullText(), node.getFullStart())
    // const comment = node.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end)
    // console.log(comment)

    //console.log((node as any).jsDoc[0].comment)
    const jsDocTags = ts.getJSDocTags(node);
    return (jsDocTags[0].parent as any).comment
    // console.log((jsDocTags[0].parent as any).comment);
}

function processNode(typeChecker: ts.TypeChecker, file: string, node: ts.SignatureDeclaration) {
    const [summary, description] = getFunctionComments(node).split("\n");

    return {
        path: path.relative(__dirname, path.join(__dirname, file)),
        summary,
        description,
        inputType: node.parameters.map(param => serialiseType(typeChecker, param.type)),
        returns: serialiseType(typeChecker, node.type)
    }
}

const heritageTypeParams = new Map<ts.Symbol, ts.NodeArray<ts.TypeNode>>();
function serialiseType(typeChecker: ts.TypeChecker, type: ts.TypeNode) {
    const typeNodeSchema = {};
    if (ts.isTypeReferenceNode(type)) {
        const typeReferenceShape = typeChecker.getTypeAtLocation(type);
        const symbol = typeReferenceShape.symbol || typeReferenceShape.aliasSymbol
        if (symbol) {
            if (type.typeArguments) {
                heritageTypeParams.set(symbol, type.typeArguments)
            }
            const declarations = symbol.getDeclarations();
            for (let i = 0; i < declarations.length; i++) {
                const declaration = declarations[i];
                if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                    if (type.typeArguments) {
                        for (const typeParam of declaration.typeParameters) {
                            heritageTypeParams.set(typeChecker.getTypeAtLocation(typeParam).symbol, type.typeArguments)
                        }
                    }
                }
                extend(typeNodeSchema, serialiseType(typeChecker, declaration as unknown as ts.TypeNode))
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
        for (const declaration of declarations) {
            extend(typeNodeSchema, serialiseType(typeChecker, declaration as unknown as ts.TypeNode))
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
        for(const path of order) {
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

// Run the extract function with the script's arguments
extract("./handlers/handler.inline.ts", "handler");
//extract("./handlers/handler.typeRef.ts", "handler");
extract("./handlers/handler.separate.export.ts", "handler");
//extract("./handlers/handler.function.ts", "handler");
