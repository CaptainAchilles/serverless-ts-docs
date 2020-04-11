import * as ts from "typescript";
import { processNode, SchemaDoc } from "./walk";

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
        && node.name &&
        node.name.text.trim() === identifier) {
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

function findExportHandler(parent: ts.Node, identifier: string, done: (node: ts.ArrowFunction | ts.FunctionDeclaration) => void) {
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
export function extract(file: string, identifier: string): void {
    // Create a Program to represent the project, then pull out the
    // source file to parse its AST.
    let program = ts.createProgram([file], {
        allowJs: true
    });
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) {
        throw new Error("Failed to load the file")
    }

    // Init the type checker
    const typeChecker = program.getTypeChecker();
    const foundNodes: SchemaDoc[] = [];

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
        console.log(`Could not find '${identifier}' in ${file}. (Have your exported a '${identifier}' function?)`);
        process.exitCode = 1;
    } else {
        foundNodes.map(f => {
            console.log(JSON.stringify(f, null, 4))
        });
    }
}

if (require.main === module) {
    if (process.argv.length < 3 || process.argv.length > 4) {
        console.log(`Usage: ${process.argv[0]} fileName exportFunction`)
    }
    const lastTwoArgs = process.argv.slice(process.argv.length - 2)
    extract(lastTwoArgs[0], lastTwoArgs[1])
}