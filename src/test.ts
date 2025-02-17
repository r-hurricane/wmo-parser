import nodeFs from 'node:fs';
import nodePath from 'node:path';

interface ITestCaseFile {
    [key: string]: boolean
}

type ITestFileMap = Map<string, ITestCaseFile>;

(() => {

    // Method to recursively build test files
    const getFiles = (dir: string): ITestFileMap => {

        // List the files in the provided directory
        const fileMap: ITestFileMap = new Map<string, ITestCaseFile>;
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

    // Ensure a test

    console.log(process.argv);
    console.log(import.meta.url);
    console.log(getFiles('/mnt/e/Projects/r-Hurricane/wmo-parser/tests/cases'));
})();