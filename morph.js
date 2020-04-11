"use strict";
exports.__esModule = true;
var ts_morph_1 = require("ts-morph");
// initialize
var project = new ts_morph_1.Project({
// Optionally specify compiler options, tsconfig.json, in-memory file system, and more here.
// If you initialize with a tsconfig.json, then it will automatically populate the project
// with the associated source files.
// Read more: https://ts-morph.com/setup/
});
// add source files
project.addSourceFilesAtPaths("./handlers/**.ts");
var sourceFile = project.getSourceFileOrThrow("handler.ts");
var handler = sourceFile.getExportSymbols().find(function (x) {
    return x.getEscapedName() === "Handler";
});
console.log(handler.getDeclaredType().getAliasSymbol().getDeclarations());
// .getExportAssignment(x => {
//     console.log(x);
//     return false;
//     //return x.name
// })
// const myClassFile = project.createSourceFile("src/MyClass.ts", "export class MyClass {}");
// const myEnumFile = project.createSourceFile("src/MyEnum.ts", {
//     statements: [{
//         kind: StructureKind.Enum,
//         name: "MyEnum",
//         isExported: true,
//         members: [{ name: "member" }]
//     }]
// });
// // get information
// const myClass = myClassFile.getClassOrThrow("MyClass");
// myClass.getName();          // returns: "MyClass"
// myClass.hasExportKeyword(); // returns: true
// myClass.isDefaultExport();  // returns: false
// // manipulate
// const myInterface = myClassFile.addInterface({
//     name: "IMyInterface",
//     isExported: true,
//     properties: [{
//         name: "myProp",
//         type: "number"
//     }]
// });
// myClass.rename("NewName");
// myClass.addImplements(myInterface.getName());
// myClass.addProperty({
//     name: "myProp",
//     initializer: "5"
// });
// project.getSourceFileOrThrow("src/ExistingFile.ts").delete();
// // asynchronously save all the changes above
// await project.save();
// // get underlying compiler node from the typescript AST from any node
// const compilerNode = myClassFile.compilerNode;
