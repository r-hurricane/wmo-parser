/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
 *
 * Represents the header portion of a WMO file. See https://www.weather.gov/tg/head
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import WmoDate from './WmoDate.js';

export default class WmoHeader {
	
	#parser = null;
	
	sequence = null;
	designator = null;
	station = null;
	datetime = null;
	delay = null;
	correction = null;
	amendment = null;
	segment = null;

	constructor(parser) {
		this.#parser = parser;
		
		// Extract the sequence number (optional)
		this.sequence = parser.extract(/^\s*\d{3}\s*$/);
		
		// Confirm there is more lines after this
		if (this.sequence && parser.remainingLines() <= 0)
			parser.error('Invalid WMO message: Missing Abbreviated Heading. First line was detected as the "starting line" which is optional. Second line should then be the Abbreviated Heading as defined at https://www.weather.gov/tg/head');
		
		// Match the abbreviated heading line
		const abbvHeadingTxt = parser.currentLine();
		const abbvHeading = parser.extract(/^(\w\w\w\w\d\d)\s+(\w\w\w\w)\s+(?:(\d\d)(\d\d)(\d\d))(?:\s+(?:(RR|CC|AA)([A-X])|P([A-Z])([A-Z])))?$/);
		if (!abbvHeading)
			throw new Error('Invalid WMO message: Missing Abbreviated Heading. First line ("' + abbvHeadingTxt + '") should be the Abbreviated Heading as defined at https://www.weather.gov/tg/head');
		
		this.designator = abbvHeading[1];
		this.station = abbvHeading[2];
		this.datetime = new WmoDate(`${abbvHeading[3]} ${abbvHeading[4]}:${abbvHeading[5]}Z`, 'dd HH:mmX', parser.getDateContext());
		
		if (abbvHeading[6]) {
			this[abbvHeading[6] === 'RR' ? 'delay' : abbvHeading[6] === 'CC' ? 'correction' : 'amendment'] = abbvHeading[7];
		} else if (abbvHeading[8]) {
			this.segment = { 'major': abbvHeading[8], 'minor': abbvHeading[9], 'last': abbvHeading[8] == 'Z' };
		}
	}
	
	toJSON() {
		return {
			'sequence': this.sequence && parseInt(this.sequence[0]),
			'designator': this.designator,
			'station': this.station,
			'datetime': this.datetime,
			'delay': this.delay,
			'correction': this.correction,
			'amendment': this.amendment,
			'segment': this.segment
		};
	}

}