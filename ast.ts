import * as ts from "typescript";
import * as path from "path";
import { types } from "util";

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
        let name = "";

        if (ts.isVariableStatement(node) && isNodeExported(node)) {
            const nodeDeclarations = node.declarationList.declarations[0];
            if (nodeDeclarations.name.getText(node.getSourceFile()) !== "handler") {
                return;
            }

            const children = node.getChildren(sourceFile);
            const declaration = children.find(x => ts.isVariableDeclarationList(x)) as ts.VariableDeclarationList;
            if (!declaration) {
                return;
            }
            const syntaxList = declaration.getChildren().find(x => x.kind === ts.SyntaxKind.SyntaxList) as ts.SyntaxList

            const variableDeclaration = syntaxList._children.find(x => ts.isVariableDeclaration(x)) as ts.VariableDeclaration;
            if (!variableDeclaration) {
                return;
            }

            const arrowFunction = variableDeclaration.getChildren().find(x => ts.isArrowFunction(x)) as ts.ArrowFunction;
            if (!arrowFunction) {
                return;
            }

            console.log(JSON.stringify(arrowFunction.parameters.map(x => serialiseType(typeChecker, x.type)), null, 4))
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
            foundNodes.push(processNode(typeChecker, file, node as any))
        } else {
            unresolvedNodes.push(node)
        }
    });

    // Either print the found nodes, or offer a list of what identifiers were found
    if (!foundNodes.length) {
        console.log(`Could not find '${identifier}' in ${file}, found: ${unresolvedNodes.filter(f => f[0]).map(f => f[0]).join(", ")}.`);
        process.exitCode = 1;
    } else {
        foundNodes.map(f => {
            console.log(f)
        });
    }
}
/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
}



function processNode(typeChecker: ts.TypeChecker, file: string, node: ts.MethodDeclaration) {
    const [summary, description] = getFunctionComments(node).split("\n");
    console.log({
        ...node,
        parent: null
    })
    console.log(typeChecker.getSignatureFromDeclaration(node))
    return {
        path: path.relative(__dirname, path.join(__dirname, file)),
        summary,
        description,
        pathParameters: {

        },
        queryStringParameters: {

        },
        returns: {

        }
    }
}

function serialiseType(typeChecker: ts.TypeChecker, type: ts.TypeNode) {
    const typeNodeSchema = {};

    
    if (ts.isTypeReferenceNode(type)) {
        for (const typeNode of type.typeArguments) {
            const typeReferenceShape = typeChecker.getTypeAtLocation(type);
            const declarations = typeReferenceShape.symbol.getDeclarations();
            for(const declaration of declarations) {
                Object.assign(typeNodeSchema, serialiseType(typeChecker, declaration as unknown as ts.TypeNode))
            }
            Object.assign(typeNodeSchema, serialiseType(typeChecker, typeNode))
        }
    } else if (ts.isPropertySignature(type)) {
        typeNodeSchema[type.name.getText()] = serialiseType(typeChecker, type.type as ts.TypeNode)
    }
    else if (ts.isTypeLiteralNode(type)) {
        for (const member of type.members) {
            Object.assign(typeNodeSchema, serialiseType(typeChecker, member as unknown as ts.TypeNode))
        }
    } else if (ts.isInterfaceDeclaration(type)) {
        for(const heritage of type.heritageClauses) {
            for(const typeNode of heritage.types) {
                Object.assign(typeNodeSchema, serialiseType(typeChecker, typeNode as ts.TypeNode))
            }
        }
        for(const member of type.members) {
            Object.assign(typeNodeSchema, serialiseType(typeChecker, member as any))
        }

    } else if (ts.isExpressionWithTypeArguments(type)) {
        console.log(type);
    } else {
        return typeName(type);
    }

    return typeNodeSchema;
}

function getFunctionComments(node: ts.MethodDeclaration): string {
    // const [commentRange] = ts.getLeadingCommentRanges(node.getSourceFile().getFullText(), node.getFullStart())
    // const comment = node.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end)
    // console.log(comment)

    //console.log((node as any).jsDoc[0].comment)
    const jsDocTags = ts.getJSDocTags(node);
    return (jsDocTags[0].parent as any).comment
    // console.log((jsDocTags[0].parent as any).comment);
}

function typeName(node: ts.TypeNode): string {
    if (!node) {
      return ""
    }
  
    if (ts.isArrayTypeNode(node)) {
      return `Array<${typeName(node.elementType)}>`
    }
  
    if (ts.isTupleTypeNode(node)) {
      return `[${node.elementTypes.map(it => typeName(it))}]`
    }
  
    if (ts.isUnionTypeNode(node)) {
      return node.types.map(typeName).join(" | ")
    }
    // if (ts.isTypeReferenceNode(node)) {
    //   let name = tokenName(node.typeName)
    //   if (node.typeArguments) {
    //     name += `<${node.typeArguments.map(it => typeName(it)).join(", ")}>`
    //   }
    //   return name
    // }
    if (ts.isFunctionTypeNode(node)) {
      return node.getText()
    }

    if (ts.isTypeLiteralNode(node) || ts.isLiteralTypeNode(node)) {
      return node.getText()
    }
    if (ts.isExpressionWithTypeArguments(node)) {
      return node.getText()
    }
    if (ts.isTypeOperatorNode(node)) {
      return node.getText()
    }
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return "string"
      case ts.SyntaxKind.BooleanKeyword:
        return "boolean"
      case ts.SyntaxKind.NumberKeyword:
        return "number"
      case ts.SyntaxKind.AnyKeyword:
        return "any"
      case ts.SyntaxKind.VoidKeyword:
        return "void"
      case ts.SyntaxKind.NullKeyword:
        return "null"
      case ts.SyntaxKind.UndefinedKeyword:
        return "undefined"
      case ts.SyntaxKind.NeverKeyword:
        return "never"
    }

    console.error("Type not handled:", node.kind, ts.SyntaxKind[node.kind], node.getText())
    return ""
  }

// Run the extract function with the script's arguments
extract("./handlers/handler.ts", "handler");