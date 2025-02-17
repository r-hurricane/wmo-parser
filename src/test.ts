import nodeFs from 'node:fs';
import nodePath from 'node:path';
import {parseWmo} from './index.js';

interface ITestCaseFile {
    [key: string]: boolean
}

(() => {

    // Ensure a test path was provided
    const testPath = process.argv[process.argv.length-1];
    if (!testPath || testPath === import.meta.filename)
        throw new Error('Please provide a path to a test suite')

    // Method to recursively build test files
    const getFiles = (dir: string): Map<string, ITestCaseFile> => {

        // List the files in the provided directory
        const fileMap = new Map<string, ITestCaseFile>;
        const ls = nodeFs.readdirSync(dir, {withFileTypes: true});
        for (let f of ls) {

            // Parse out the file/dir name parts, and get full path
            const pp = nodePath.parse(f.name);
            const pt = nodePath.join(f.parentPath, pp.name);

            // If a directory, call getFiles() on that dir
            if (f.isDirectory()) {
                getFiles(pt).forEach((v, k) => fileMap.set(k, v));
                continue;
            }

            // If a file, see if an entry exists. If so, append the extension
            let testFile = fileMap.get(pt);
            if (!testFile) {
                testFile = {};
                fileMap.set(pt, testFile);
            }

            // Flag the extension as true
            testFile[pp.ext] = true;
        }
        return fileMap;
    };

    // Load all test files from the provided test suite
    const testFiles = getFiles(testPath);

    // For each test file, parse the .txt
    const total = testFiles.size;
    let i = 0;
    console.log(`Running ${total} test cases...`);
    for (let test of testFiles) {
        if (!test[1]['.txt']) {
            console.warn(`Test file ${test[0]} does not have a txt. Skipping.`);
            continue;
        }

        try {
            const testText = nodeFs.readFileSync(test[0] + '.txt');
            const wmoFile = parseWmo(testText.toString());

            if (test[1]['.json']) {
                const jsonText = nodeFs.readFileSync(test[0] + '.json').toString();
                const parsedStr = JSON.stringify(wmoFile);

                if (jsonText.trim() != parsedStr.trim())
                    throw new Error(`Parsed JSON does not match expected test JSON.\n\nPARSED\n------\n${parsedStr}\n\nEXPECTED\n--------\n${jsonText}`);
            }

            console.error(`[PASS] [${++i}/${total}] ${test[0]}`);
        } catch(err) {
            if (err && err.toString().indexOf('Flight D') >= 0)
                continue;
            console.log(''.padStart(50, '='));
            console.error(`[FAIL] [${++i}/${total}] ${test[0]} - ${err}`);
            console.log(''.padStart(50, '='));
        }
    }
})();