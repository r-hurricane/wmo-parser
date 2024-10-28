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

import WmoDesignator from './WmoDesignator.js';
import WmoDate from '../WmoDate.js';

export default class NOUS42 extends WmoDesignator {
	
/*
NOUS42 KNHC 261358
REPRPD
WEATHER RECONNAISSANCE FLIGHTS
CARCAH, NATIONAL HURRICANE CENTER, MIAMI, FL.
1000 AM EDT SAT 26 OCTOBER 2024
SUBJECT: TROPICAL CYCLONE PLAN OF THE DAY (TCPOD)
         VALID 27/1100Z TO 28/1100Z OCTOBER 2024
         TCPOD NUMBER.....25-148

I.  ATLANTIC REQUIREMENTS
    1. NEGATIVE RECONNAISSANCE REQUIREMENTS.
    2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.

II. PACIFIC REQUIREMENTS
    1. NEGATIVE RECONNAISSANCE REQUIREMENTS.
    2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.

$$
*/

	issued = null;
	start = null;
	end = null;
	tcpod = null;
	correction = null;
	amendment = null;
	
	atlantic = null;
	pacific = null;

	constructor(wmoFile) {
		super(wmoFile);
		
		// Get parser
		const p = wmoFile.parser;
		
		// Skip first few header lines
		p.extract(/^REPRPD$/);
		p.extract(/^WEATHER RECONNAISSANCE FLIGHTS$/);
		p.extract(/NATIONAL HURRICANE CENTER/);
		
		// Extract date info
		const dateLine = p.extract();
		if (!dateLine)
			p.error('Expected date line, but nothing found');
		
		// Parse issued date
		this.issued = new WmoDate(dateLine[0], 'hhmm a XXX EEE dd MMMM yyyy');
		
		// Skip subject line
		p.extract(/^SUBJECT:/);
		
		// Extract valid dates
		const validRange = p.extract(/VALID (\d{2})\/(\d{4}Z) TO (\d{2})\/(\d{4}Z) (\w+) (\d{4})/);
		if (!validRange)
			p.error('Expected TCPOD valid line "VALID ##/####Z TO ##/####Z MONTHNAME 20##"');
		this.start = new WmoDate(`${validRange[2]} ${validRange[1]} ${validRange[5]} ${validRange[6]}`, 'HHmmX dd MMMM yyyy');
		this.end = new WmoDate(`${validRange[4]} ${validRange[3]} ${validRange[5]} ${validRange[6]}`, 'HHmmX dd MMMM yyyy');
		
		// Extract TCPOD number
		const tcpodNo = p.extract(/TCPOD NUMBER\.*((\d+)-(\d+))( CORRECTION)?( AMENDMENT)?/);
		if (!tcpodNo)
			p.error('Expected TCPOD NUMBER line "TCPOD NUMBER...##-###( CORRECTION| AMENDMENT)?"');
		this.tcpod = {
			'full': tcpodNo[1],
			'yr': tcpodNo[2],
			'seq': tcpodNo[3]
		};
		this.correction = !!tcpodNo[4];
		this.amendment = !!tcpodNo[5];
	}
	
	toJSON() {
		return {
			'issued': this.issued,
			'start': this.start,
			'end': this.end,
			'tcpod': this.tcpod,
			'correction': this.correction,
			'amendment': this.amendment
		};
	}
		
}