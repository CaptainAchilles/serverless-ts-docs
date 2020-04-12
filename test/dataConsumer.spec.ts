import expect from "expect";
import { extract } from "../lib"
import testCases from "./dataProvider";

describe("Can parse different file types", () => {
    for (const testCase of testCases) {
        it(`Works for ${testCase.filePath}`, () => {
            expect(extract(testCase.filePath, testCase.identifier)).toStrictEqual(testCase.expectedResult)
        })
    }
})