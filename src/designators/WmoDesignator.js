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

export default class WmoDesignator {
	
	wmoFile = null;
	
	constructor(wmoFile) {
		this.wmoFile = wmoFile;
	}
	
	toJSON() {
		return { };
	}
	
}