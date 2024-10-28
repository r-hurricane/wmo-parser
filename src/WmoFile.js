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

export default class WmoFile {
	
	#parser;
	
	header;
	
	constructor(wmoText, options) {
		this.parser = new WmoParser(wmoText, options);
		this.header = new WmoHeader(this.parser);
	}
	
	toJSON() {
		return {
			'header': this.header
		}
	}
	
}