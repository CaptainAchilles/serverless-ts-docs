import * as fs from "fs";
import * as tsdox from "ts-dox";
import * as stream from "stream"


function transformFile(options: { filePath: string }) {
    return function (file, encoding, cb) {
        const json = tsdox.extract(options.filePath, file.toString());
        const mapped = json;
        const text = JSON.stringify(mapped, null, 4);
        cb(null, Buffer.from(text));
    };
}

const transformStream = new stream.Transform({
    objectMode: true, transform: transformFile({
        filePath: "./handlers/handler.ts"
    })
});

transformStream.pipe(process.stdout);
fs.createReadStream("./handlers/handler.ts", "utf8")
    .pipe(
        transformStream        
    )

