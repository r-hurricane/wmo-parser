/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
 *
 * Wrapper and parser for dates found in a WMO file.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import * as dateFns from 'date-fns';

export default class WmoFile {
	
	date = null;
	
	constructor(dateStr, format, dateCtx) {
			// TODO: Find something better here, but there doesnt appear to be a good solution for some reason...
		dateStr = dateStr.replace('EDT', '-04:00')
			.replace('EST', '-05:00')
			.replace('CDT', '-05:00')
			.replace('CST', '-06:00')
			.replace('MDT', '-06:00')
			.replace('MST', '-07:00')
			.replace('PDT', '-07:00')
			.replace('PST', '-08:00');
			
		console.log(dateStr, format, dateCtx || new Date());
		this.date = dateFns.parse(dateStr, format, dateCtx || new Date());
		console.log(this.date, this.date instanceof Date);
		if (!this.date || !dateFns.isValid(this.date))
			throw new Error(`Failed to parse date "${dateStr}" to format "${format}".`);
	}
	
	toJSON() {
		return {
			'yr': this.date.getUTCFullYear(),
			'mon': this.date.getUTCMonth()+1,
			'day': this.date.getUTCDate(),
			'hr': this.date.getUTCHours(),
			'min': this.date.getUTCMinutes(),
			'sec': this.date.getUTCSeconds(),
			'time': this.date.getTime()
		}
	}
	
}