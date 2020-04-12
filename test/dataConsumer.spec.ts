import { resolve } from "path"
import expect from "expect";
import { extract } from "../lib"
import testCases from "./dataProvider";

describe("Can parse different file types", () => {
    it("Works for different file types", () => {
        for (const testCase of testCases) {
            expect(extract(testCase.filePath, testCase.identifier)).toStrictEqual(testCase.expectedResult)
        }
    });
})