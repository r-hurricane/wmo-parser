/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
 *
 * Parses WMO text files into objects or JSON for easy use. Now, I know what some might think, "Why not use grammars and
 * syntax trees?" Well, these text files sometimes have nuances (like the NOUS42 Tropical Cyclone Plan of the Day) that
 * don't play well with a concrete grammar/tree... Trying to extract data that potentially depends on other parts of the
 * file or even other WMO files seemed too complex for a simple grammar and syntax tree. I may explore that in the
 * future, but for now this works!
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import WmoParseError from './WmoParseError.js';

export default class WmoParser {

	#options = null;
	#fileLines = null;
	#position = 0;
	
	constructor(wmoText, options) {
		
		// Process options
		options = options || {};
		this.#options = {
			date: options.date || new Date()
		};

		// Ensure text is not undefined, null or empty
		if (!wmoText || typeof wmoText !== 'string')
			throw new Error('Provided WMO Text must be a defined, non-empty string. Received ' + (typeof wmoText) + '.');

		// Ensure not empty (strip "Start of Header" if exists)
		const trimmed = wmoText.replace('\x01', '').trim();
		if (trimmed.length <= 0)
			throw new Error('Provided WMO Text was empty');
		
		// Split into lines (note: guaranteed to have at least 1, otherwise would have been trimmed above)
		this.#fileLines = trimmed.split(/\r?\n/);
	}
	
	getDateContext() {
		return this.#options.date;
	}
	
	currentLine() {
		return this.#fileLines !== null && this.#position >= 0 && this.#position < this.#fileLines.length
			? this.#fileLines[this.#position]
			: null;
	}
	
	totalLines() {
		return this.#fileLines.length;
	}
	
	remainingLines() {
		return this.#fileLines.length - this.#position;
	}
	
	peek(count = 1) {
		const linePos = this.#position + count;
		return this.#fileLines !== null && linePos >= 0 && linePos < this.#fileLines.length
			? this.#fileLines[linePos]
			: null;
	}
	
	seek(count = 1) {
		// TODO: Secondary paramater for origin (start, current, end)
		// TODO: Bounds check. Throw if exceeds.
		this.#position += count;
	}
	
	skipEmpty() {
		while (this.currentLine()?.trim() === '') {
			++this.#position;
		}
	}
	
	extract(pattern = /^.*$/, trim = true, skipIfEmpty = true) {
		const line = trim ? this.currentLine().trim() : this.currentLine();
		
		const lineMatch = line.match(pattern);
		if (!lineMatch)
			return;
		
		++this.#position;
		
		if (skipIfEmpty)
			this.skipEmpty();
		
		return lineMatch;
	}
	
	extractAll(pattern, trim = true, skipIfEmpty = true) {
		const line = trim ? this.currentLine().trim() : this.currentLine();
		
		const lineMatch = [...line.matchAll(pattern)];
		if (!lineMatch || lineMatch.length <= 0)
			return;
		
		++this.#position;
		
		if (skipIfEmpty)
			this.skipEmpty();
		
		return lineMatch;
	}
	
	error(message, originalError) {
		// If no line data, just throw error
		if (this.#fileLines === null) {
			throw new WmoParseError(message, originalError);
		}

		// Otherwise, add the line context info to the output
		let context = `${message}\n====================`;
		
		// Constant helpers
		const p = this.#position;
		const lines = this.#fileLines;
		const padSize = (this.#position+3).toString().length;
		
		// Populate context
		const ctxLines = 5;
		for (let i = ctxLines * -1; i <= ctxLines; ++i) {
			if (lines[p+i]?.length >= 0)
				context += `\n${i === 0 ? '-->' : '   '} ${(p+i).toString().padStart(padSize, '0')} | ${lines[p+i]}`;
		}
		
		throw new WmoParseError(context + `\n====================`, originalError);
	}
}