"use strict";
exports.__esModule = true;
var fs = require("fs");
var tsdox = require("ts-dox");
var stream = require("stream");
function transformFile(options) {
    return function (file, encoding, cb) {
        var json = tsdox.extract(options.filePath, file.toString());
        var mapped = json;
        var text = JSON.stringify(mapped, null, 4);
        cb(null, Buffer.from(text));
    };
}
var transformStream = new stream.Transform({
    objectMode: true, transform: transformFile({
        filePath: "./handlers/handler.ts"
    })
});
transformStream.pipe(process.stdout);
fs.createReadStream("./handlers/handler.ts", "utf8")
    .pipe(transformStream);
// .pipe(tsdox.transform())
