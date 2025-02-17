/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses WMO text files into objects or JSON for easy use. Now, I know what some might think, "Why not use grammars and
 * syntax trees?" Well, these text files sometimes have nuances (like the NOUS42 Tropical Cyclone Plan of the Day) that
 * don't play well with a concrete grammar/tree... Trying to extract data that potentially depends on other parts of the
 * file or even other WMO files seemed too complex for a simple grammar and syntax tree. I may explore other ideas in
 * the future.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {WmoParseError} from './WmoParseError.js';
import {IWmoOptions} from "./WmoInterfaces.js";

export enum SeekOrigin {
    start,
    current,
    end
}

export class WmoParser {

    private readonly options: IWmoOptions;
    private readonly fileLines: string[];

    private position: number = 0;

    public constructor(wmoText: string, options?: IWmoOptions) {

        // Set options
        this.options = options || {};
        this.options.dateCtx = this.options.dateCtx ?? new Date();

        // Ensure not empty (strip "Start of Header" if exists)
        const trimmed = wmoText.replace('\x01', '').trim();
        if (trimmed.length <= 0)
            this.error('Provided WMO Text was empty');

        // Split into lines (note: guaranteed to have at least 1, otherwise would have been trimmed above)
        this.fileLines = trimmed.split(/\r?\n/);
    }

    public getDateContext(): Date {
        return this.options.dateCtx ?? new Date();
    }

    public totalLines(): number {
        return this.fileLines.length;
    }

    public remainingLines(): number {
        return this.fileLines.length - this.position;
    }

    public peek(count: number = 0): string | undefined {
        const linePos = this.position + count;
        return linePos >= 0 && linePos < this.fileLines.length
            ? this.fileLines[linePos]
            : undefined;
    }

    public seek(count: number = 0, origin: SeekOrigin = SeekOrigin.current): void {
        const curPos = this.position;
        const totalCount = this.totalLines();
        const newPos = origin == SeekOrigin.start
            ? count
            : origin == SeekOrigin.end
                ? totalCount + count
                : curPos + count;
        if (newPos < 0 || newPos >= totalCount)
            this.error(`Unable to seek ${count} from ${SeekOrigin[origin]}: Out of Bounds`);
        this.position += count;
    }

    public skipEmpty(): void {
        while (this.peek()?.trim() === '') {
            ++this.position;
        }
    }

    public extract(pattern: RegExp = /^.*$/, trim: boolean = true, skipIfEmpty: boolean = true)
        : RegExpMatchArray | undefined
    {
        // Get the current line, and skip if EOF
        const line = trim ? this.peek()?.trim() : this.peek();
        if (!line)
            return;

        // Try and match the line to the provided Regular Expression
        const lineMatch = line.match(pattern);
        if (!lineMatch)
            return;

        // If we found a match, move parser to the next line!
        ++this.position;

        // If asked to skip empty lines, move the parser to the next non-empty line (or EOF)
        if (skipIfEmpty)
            this.skipEmpty();

        // Return match details
        return lineMatch;
    }

    public extractAll(pattern: RegExp, trim: boolean = true, skipIfEmpty: boolean = true)
        : RegExpExecArray[] | undefined
    {
        // Get the current line, and skip if EOF
        const line = trim ? this.peek()?.trim() : this.peek();
        if (!line)
            return;

        // Run match all
        const lineMatch = [...line.matchAll(pattern)];
        if (!lineMatch || lineMatch.length <= 0)
            return;

        // If we found a match, move parser to the next line!
        ++this.position;

        // If asked to skip empty lines, move the parser to the next non-empty line (or EOF)
        if (skipIfEmpty)
            this.skipEmpty();

        // Return match details
        return lineMatch;
    }

    public error(message: string, originalError?: Error): never {
        // If no line data, just throw error
        if (this.fileLines === null) {
            throw new WmoParseError(message, originalError);
        }

        // Otherwise, add the line context info to the output
        let context = `${message}\n====================`;

        // Constant helpers
        const p = this.position;
        const lines = this.fileLines;
        const padSize = (p+3).toString().length;

        // Populate context
        const ctxLines = 5;
        for (let i = ctxLines * -1; i <= ctxLines; ++i) {
            const ctxPos = p + i;
            if (ctxPos > 0 && ctxPos < lines.length && lines[ctxPos] !== undefined)
                context += `\n${i === 0 ? '-->' : '   '} ${(p+i).toString().padStart(padSize, '0')} | ${lines[p+i]}`;
        }

        throw new WmoParseError(context + `\n====================`, originalError);
    }
}