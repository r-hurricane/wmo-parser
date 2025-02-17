/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the raw Urxx15 High-Density Observation Bulletin (HDOB) messages from aircraft recon.
 * See https://www.nhc.noaa.gov/abouthdobs_2007.shtml for details
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoCoordinates, IWmoObject} from "../../WmoInterfaces.js";
import {IWmoDate, WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {IWmoMessage, WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export interface IUrxx15 extends IWmoMessage {
	header: IUrxx15Header;
	data: IUrxx15Data[];
}

export class URXX15 extends WmoMessage {

	public readonly header: Urxx15Header;
	public readonly data: Urxx15Data[] = [];

	public constructor(wmoFile: WmoFile) {
		super(wmoFile);
		
		// Parse header
		this.header = new Urxx15Header(wmoFile.parser);
		
		// Continue data parsing until literal $$
		let nextLine = wmoFile.parser.peek();
		while(nextLine && !nextLine.match(/\$\$/)) {
			this.data.push(new Urxx15Data(wmoFile.parser, this.header));
			nextLine = wmoFile.parser.peek();
		}
	}
	
	public override toJSON(): IUrxx15 {
		return {
			header: this.header.toJSON(),
			data: this.data.map(d => d.toJSON())
		};
	}
}

export interface IUrxx15Header {
	agency: string | null;
	aircraft: string | null;
	missionNo: string | null;
	stormNo: string | null;
	location: string | null;
	stormName: string | null;
	obsNo: string | null;
	date: IWmoDate | null;
}

export class Urxx15Header implements IWmoObject {
	
	public readonly agency: string | null = null;
	public readonly aircraft: string | null = null;
	public readonly missionNo: string | null = null;
	public readonly stormNo: string | null = null;
	public readonly location: string | null = null;
	public readonly stormName: string | null = null;
	public readonly obsNo: string | null = null;
	public readonly date: WmoDate | null = null;
	
	public constructor(p: WmoParser) {
		
		// Extract header line
		// NOAA2 1714A MILTON             HDOB 08 20241008
		// 11112 33445 666666                  77 88888888
		const headerLine = p.assert(
			'Expected HDOB header line.',
			/^\s*(\w+)(\d+)\s+(W[A-Z]|\d{2})(\d{2}|[A-Z]{2})([AECW])\s+(\w+?)\s+HDOB\s+(\d{2})\s+(\d{8})\s*$/);
		
		this.agency = headerLine[1] ?? null;
		this.aircraft = headerLine[2] ?? null;
		this.missionNo = headerLine[3] ?? null;
		this.stormNo = headerLine[4] ?? null;
		this.location = headerLine[5] ?? null;
		this.stormName = headerLine[6] ?? null;
		this.obsNo = headerLine[7] ?? null;

		if (headerLine[8])
			this.date = new WmoDate(headerLine[8] + 'Z', 'yyyyMMddX');
	}
	
	public toJSON(): IUrxx15Header {
		return {
			agency: this.agency,
			aircraft: this.aircraft,
			missionNo: this.missionNo,
			stormNo: this.stormNo,
			location: this.location,
			stormName: this.stormName,
			obsNo: this.obsNo,
			date: this.date?.toJSON() ?? null
		};
	}
}

export interface IUrxx15PositionQuality {
	raw: number;
	pos: boolean;
	pral: boolean;
}

export interface IUrxx15MetricQuality {
	raw:  number;
	temp: boolean;
	wind: boolean;
	sfmr: boolean;
}

export interface IUrxx15Data {
	time: IWmoDate | null;
	loc: IWmoCoordinates | null;
	acpr: number | null;
	acal: number | null;
	espr: number | null;
	dval: number | null;
	temp: number | null;
	dewp: number | null;
	wdir: number | null;
	wspd: number | null;
	wmax: number | null;
	sfmrw: number | null;
	sfmrr: number | null;
	pqal: IUrxx15PositionQuality | null;
	mqal: IUrxx15MetricQuality | null;
}

export class Urxx15Data implements IWmoObject {
	
	public readonly time: WmoDate | null = null;
	public readonly coordinates: IWmoCoordinates | null = null;
	public readonly craftPressure: number | null = null;
	public readonly craftGeoHeight: number | null = null;
	public readonly surfPressure: number | null = null;
	public readonly dValue: number | null = null;
	public readonly airTemp: number | null = null;
	public readonly dewTemp: number | null = null;
	public readonly windDir: number | null = null;
	public readonly windSpeed: number | null = null;
	public readonly maxWind: number | null = null;
	public readonly sfmrWind: number | null = null;
	public readonly sfmrRain: number | null = null;
	public readonly posQual: IUrxx15PositionQuality | null = null;
	public readonly metQual: IUrxx15MetricQuality | null = null;
	
	public constructor(p: WmoParser, header: Urxx15Header) {
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
		
		const l = p.assert(
			'Expected a data line, $$ end literal, or end of file',
			/^\s*(\d{6})\s+(\d{2})(\d{2})([NS])\s+(\d{3})(\d{2})([EW])\s+(\d{4}|\/{4})\s+(\d{5}|\/{5})\s+(\d{4}|\/{4})\s+([+-]\d{3}|\/{4})\s+([+-]\d{3}|\/{4})\s+(\d{3}|\/{3})(\d{3}|\/{3})\s+(\d{3}|\/{3})\s+(\d{3}|\/{3})\s+(\d{3}|\/{3})\s+(\d)(\d)$/);
		//       1:hhmmss  2:LL   3:LL   4:H      5:NNN  6:NN   7:W      8:PPPP          9:GGGGG        10:XXXX         11:sTTT             12:sddd             13:www         14:SSS        15:MMM          16:KKK          17:ppp          18:F19:F
		
		// Parse time, relative to header date
		if (l[1])
			this.time = new WmoDate(l[1] + 'Z', 'HHmmssX', header.date);
		
		// Coordinates are in degrees + minutes
		this.coordinates = {
			'lat': parseFloat(((parseInt(l[2] ?? '0') + parseInt(l[3] ?? '0')/60.0) * (l[4] === 'N' ? 1 : -1)).toFixed(3)),
			'lon': parseFloat(((parseInt(l[5] ?? '0') + parseInt(l[6] ?? '0')/60.0) * (l[7] === 'E' ? 1 : -1)).toFixed(3))
		};
		
		// Static air pressure (1 is dropped if > 1000, so ifnthe first didget is <= 3, add the 1 back in)
		this.craftPressure = l[8] && l[8][0] && l[8][0] !== '/' ? parseInt((parseInt(l[8][0]) <= 3 ? '1' : '') + l[8]) / 10.0 : null;
		
		// Aircraft geopotential height
		this.craftGeoHeight = l[9] && l[9][0] !== '/' ? parseInt(l[9]) : null;
		
		// Extrapolated surface pressure (1 dropped if > 1000)
		if (this.craftPressure && this.craftPressure > 550)
			this.surfPressure = l[10] && l[10][0] && l[10][0] !== '/' ? parseInt((parseInt(l[10][0]) <= 3 ? '1' : '') + l[10]) / 10.0 : null;
		else
			this.dValue = l[10] && l[10][0] === '/' ? parseInt(l[10]) : null; // NOTE: 5000 is added to negative galues, but I need examples...
		
		// Temperatures
		this.airTemp = l[11] && l[11][0] !== '/' ? parseInt(l[11])/10.0 : null;
		this.dewTemp = l[12] && l[12][0] !== '/' ? parseInt(l[12])/10.0 : null;
		
		// Wind direction and speed
		this.windDir = l[13] && l[13][0] !== '/' && l[13] !== '999' ? parseInt(l[13]) : null;
		this.windSpeed = l[14] && l[14][0] !== '/' && l[14] !== '999' ? parseInt(l[14]) : null;
		this.maxWind = l[15] && l[15][0] !== '/' && l[15] !== '999' ? parseInt(l[15]) : null;
		
		// SFMR readings
		this.sfmrWind = l[16] && l[16][0] !== '/' && l[16] !== '999' ? parseInt(l[16]) : null;
		this.sfmrRain = l[17] && l[17][0] !== '/' && l[17] !== '999' ? parseInt(l[17]) : null;
		
		// Quality control
		if (l[18]) {
			const posQual = parseInt(l[18]);
			this.posQual = {
				raw: posQual,
				pos: posQual !== 1 && posQual !== 3,
				pral: posQual < 2
			};
		}

		if (l[19]) {
			const metQual = parseInt(l[19]);
			this.metQual = {
				raw: metQual,
				temp: metQual !== 1 && metQual !== 4 && metQual !== 5 && metQual !== 9,
				wind: metQual !== 2 && metQual !== 4 && metQual !== 6 && metQual !== 9,
				sfmr: metQual !== 3 && metQual < 5
			};
		}
	}
	
	public toJSON(): IUrxx15Data {
		return {
			time: this.time?.toJSON() ?? null,
			loc: this.coordinates,
			acpr: this.craftPressure,
			acal: this.craftGeoHeight,
			espr: this.surfPressure,
			dval: this.dValue,
			temp: this.airTemp,
			dewp: this.dewTemp,
			wdir: this.windDir,
			wspd: this.windSpeed,
			wmax: this.maxWind,
			sfmrw: this.sfmrWind,
			sfmrr: this.sfmrRain,
			pqal: this.posQual,
			mqal: this.metQual
		};
	}
	
}