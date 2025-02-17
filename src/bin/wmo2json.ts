#!/usr/bin/env node

/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * A helper utility that parses the provided text file or stream into JSON.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {existsSync, createReadStream, ReadStream} from "node:fs";
import {WmoFile} from '../WmoFile.js';

function readFromStream(stream: ReadStream | NodeJS.ReadStream): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Array<Buffer<ArrayBufferLike>> = [];

        stream.on('data', (chunk) => {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
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
    let inputStream: ReadStream | NodeJS.ReadStream;
    const args = process.argv;

    // Check if a file was given
    if (args.length >= 3 && args[2]) {
        if (!existsSync(args[2]))
            throw new Error(`File not found: ${args[2]}`);
        inputStream = createReadStream(args[2]);

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
    process.stdout.write(JSON.stringify(new WmoFile(input)));
})();
