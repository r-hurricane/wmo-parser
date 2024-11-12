/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
 *
 * Parses the raw URNT15 High-Density Observation Bulletin (HDOB) messages from aircraft recon.
 * See https://www.nhc.noaa.gov/abouthdobs_2007.shtml for details
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import WmoDesignator from './WmoDesignator.js';
import WmoDate from '../WmoDate.js';

export default class URNT15 extends WmoDesignator {

	header = null;
	data = [];

	constructor(wmoFile) {
		super(wmoFile);
		
		// Parse header
		this.header = new Urnt15Header(wmoFile.parser);
		
		// Continue data parsing until literal $$
		let nextLine = wmoFile.parser.currentLine();
		while(nextLine && !nextLine.match(/\$\$/)) {
			this.data.push(new Urnt15Data(wmoFile.parser, this.header));
			nextLine = wmoFile.parser.currentLine();
		}
	}
	
	toJSON() {
		return {
			'header': this.header,
			'data': this.data
		};
	}
}

export class Urnt15Header {
	
	agency = null;
	aircraft = null;
	missionNo = null;
	stormNo = null;
	location = null;
	stormName = null;
	obsNo = null;
	date = null;
	
	constructor(p) {
		
		// Extract header line
		// NOAA2 1714A MILTON             HDOB 08 20241008
		// 11112 33445 666666                  77 88888888
		const headerLine = p.extract(/^\s*(\w+)(\d+)\s+(W[A-Z]|\d{2})(\d{2})([AECW])\s+(\w+?)\s+HDOB\s+(\d{2})\s+(\d{8})\s*$/);
		if (!headerLine)
			p.error('Expected header line.');
		
		this.agency = headerLine[1];
		this.aircraft = headerLine[2];
		this.missionNo = headerLine[3];
		this.stormNo = headerLine[4];
		this.location = headerLine[5];
		this.stormName = headerLine[6];
		this.obsNo = headerLine[7];
		this.date = new WmoDate(headerLine[8], 'yyyyMMdd');
	}
	
	toJSON() {
		return {
			'agency': this.agency,
			'aircraft': this.aircraft,
			'missionNo': this.missionNo,
			'stormNo': this.stormNo,
			'location': this.location,
			'stormName': this.stormName,
			'obsNo': this.obsNo,
			'date': this.date
		};
	}
}

export class Urnt15Data {
	
	time = null;
	coordinates = null;
	craftPressure = null;
	craftGeoHeight = null;
	surfPressure = null;
	dValue = null;
	airTemp = null;
	dewTemp = null;
	windDir = null;
	windSpeed = null;
	maxWind = null;
	sfmrWind = null;
	sfmrRain = null;
	posQual = null;
	metQual = null;
	
	constructor(p, header) {		
		// 0         1         2         3         4         5         6         7
		// 01234567890123456789012345678901234567890123456789012345678901234567890
		// -----------------------------------------------------------------------
		// hhmmss LLLLH NNNNNW PPPP GGGGG XXXX sTTT sddd wwwSSS MMM KKK ppp FF
		// 141100 2849N 09014W 5500 05130 0113 -025 -042 119022 023 018 000 00
		// -----------------------------------------------------------------------
		// hhmmss - Hour Min Sec
		// LLLLH  - Latitude Degrees + Minutes + N/S
		// NNNNNW - Longitude Degrees + Minutes + E/W
		// PPPP   - Aircraft static air pressure (1 dropped > 1000)
		// GGGGG  - Aircraft geopotential height (meters)
		// XXXX   - Extrapolated surface pressure or D-Value
		// sTTT   - Air temperature in degrees and tenths C
		// sddd   - Dew point temperature
		// wwwSSS - Wind direction + wind speed (kts) - 999 = missing
		// MMM    - Maximum 10-second average wind speed (kts) - 999 = missing
		// KKK    - SFMR Maximum 10-second average surface wind speed - 999 = missing
		// ppp    - SFMR-derived rain rate, in mm hr - 999 = missing
		// ff     - Quality control
		//          (0) Normal (1) Lat/Long ?? (2) Geopotenial alt/pressure ?? (3) both ??
		//          (0) Normal (1) Tmp/Dew ?? (2) Flight Wind ?? (3) SFMR ?? (4) Temp/Dew + Flight Wind ??
		//              (5) Temp/Dew + SFMR ?? (6) Flight Wind + SFMR ?? (9) All ??
		
		const l = p.extract(/^\s*(\d{6})\s+(\d{2})(\d{2})([NS])\s+(\d{3})(\d{2})([EW])\s+(\d{4}|\/{4})\s+(\d{5}|\/{5})\s+(\d{4}|\/{4})\s+([+-]\d{3}|\/{4})\s+([+-]\d{3}|\/{4})\s+(\d{3}|\/{3})(\d{3}|\/{3})\s+(\d{3}|\/{3})\s+(\d{3}|\/{3})\s+(\d{3}|\/{3})\s+(\d)(\d)$/);
		//                      1:hhmmss  2:LL   3:LL   4:H      5:NNN  6:NN   7:W      8:PPPP          9:GGGGG        10:XXXX         11:sTTT             12:sddd             13:www         14:SSS        15:MMM          16:KKK          17:ppp          18:F19:F
		if (!l)
			p.error('Expected a data line, $$ end literal, or end of file');
		
		// Parse time, relative to header date
		this.time = new WmoDate(l[1], 'HHmmss', header.date);
		
		// Coordintes are in degress + minutes
		this.coordinates = {
			'lat': parseFloat(((parseInt(l[2]) + parseInt(l[3])/60.0) * (l[4] === 'N' ? 1 : -1)).toFixed(3)),
			'lon': parseFloat(((parseInt(l[5]) + parseInt(l[6])/60.0) * (l[7] === 'E' ? 1 : -1)).toFixed(3))
		};
		
		// Static air pressure (1 is dropped if > 1000, so ifnthe first didget is <= 3, add the 1 back in)
		this.craftPressure = l[8][0] === '/' ? null : parseInt((parseInt(l[8][0]) <= 3 ? '1' : '') + l[8]) / 10.0;
		
		// Aircraft geopotential height
		this.craftGeoHeight = l[9][0] === '/' ? null : parseInt(l[9]);
		
		// Extrapolated surface pressure (1 dropped if > 1000)
		if (this.craftPressure && this.craftPressure > 550)
			this.surfPressure = l[10][0] === '/' ? null : parseInt((parseInt(l[10][0]) <= 3 ? '1' : '') + l[10]) / 10.0;
		else
			this.dValue = l[10][0] === '/' ? null : parseInt(l[10]); // NOTE: 5000 is added to negative galues, but I need examples...
		
		// Temperatures
		this.airTemp = l[11][0] === '/' ? null : parseInt(l[11])/10.0;
		this.dewTemp = l[12][0] === '/' ? null : parseInt(l[12])/10.0;
		
		// Wind direction and speed
		this.windDir = l[13][0] === '/' || l[13] === '999' ? null : parseInt(l[13]);
		this.windSpeed = l[14][0] === '/' || l[14] === '999' ? null : parseInt(l[14]);
		this.maxWind = l[15][0] === '/' || l[15] === '999' ? null : parseInt(l[15]);
		
		// SFMR readings
		this.sfmrWind = l[16][0] === '/' || l[16] === '999' ? null : parseInt(l[16]);
		this.sfmrRain = l[17][0] === '/' || l[17] === '999' ? null : parseInt(l[17]);
		
		// Quality control
		const posQual = parseInt(l[18]);
		this.posQual = {
			'raw': posQual,
			'pos': posQual !== 1 && posQual !== 3,
			'pral': posQual < 2
		};
		
		const metQual = parseInt(l[19]);
		this.metQual = {
			'raw': metQual,
			'temp': metQual !== 1 && metQual !== 4 && metQual !== 5 && metQual !== 9,
			'wind': metQual !== 2 && metQual !== 4 && metQual !== 6 && metQual !== 9,
			'sfmr': metQual !== 3 && metQual < 5
		};
	}
	
	toJSON() {
		return {
			'time': this.time,
			'loc': this.coordinates,
			'acpr': this.craftPressure,
			'acal': this.craftGeoHeight,
			'espr': this.surfPressure,
			'dval': this.dValue,
			'temp': this.airTemp,
			'dewp': this.dewTemp,
			'wdir': this.windDir,
			'wspd': this.windSpeed,
			'wmax': this.maxWind,
			'sfmrw': this.sfmrWind,
			'sfmrr': this.sfmrRain,
			'pqal': this.posQual,
			'mqal': this.metQual
		};
	}
	
}