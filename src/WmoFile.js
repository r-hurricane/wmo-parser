/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
 *
 * Represents a WMO file.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import WmoHeader from './WmoHeader.js';
import WmoParser from './WmoParser.js';
import designators from './designators/index.js';

export default class WmoFile {
	
	fullText = null;
	options = null;
	parser = null;
	header = null;
	data = null;
	
	constructor(wmoText, options) {
		this.fullText = wmoText;
		this.options = options;
		this.parser = new WmoParser(wmoText, options);
		this.header = new WmoHeader(this.parser);
		
		const designator = options?.designator ? options.designator : designators[this.header.designator];
		if (!designator)
			throw new Error(`No parser found for designator "${this.header.designator}". Please specify the designator via the 'designator' option.`);
		
		this.data = new designator(this);
	}
	
	toJSON() {
		return {
			'header': this.header,
			'data': this.data
		}
	}
	
}