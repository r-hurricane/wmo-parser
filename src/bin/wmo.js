#!/usr/bin/env node
import fs from 'fs';
import WmoFile from '../WmoFile.js';

function readFromStream(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        stream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        stream.on('end', () => {
            resolve(Buffer.concat(chunks).toString());
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

// First read from stdin
(async () => {
    // Get input (based on args)
    let inputStream = null;
    const args = process.argv;

    // Check if a file was given
    if (args.length >= 3) {
        if (!fs.existsSync(args[2]))
            throw new Error(`File not found: ${args[2]}`);
        inputStream = fs.createReadStream(args[2]);

        // Otherwise, pull from stdin
    } else {
        // If using a TTY, print a Ctrl+D message
        if (process.stdin.isTTY)
            console.error('Use CTRL+D to end input stream:');
        inputStream = process.stdin;
    }

    // Read from stream
    const input = await readFromStream(inputStream);

    // If input is empty, throw error
    if (!input || input.length <= 0)
        throw new Error("No input text given");

    // Parse and print!
    console.log(JSON.stringify(new WmoFile(input)));
})();
