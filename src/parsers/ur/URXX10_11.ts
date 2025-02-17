/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the raw Urxx10 / Urxx11 Recon Observations messages.
 * Details can be found in the National Hurricane Operations Plan.
 * A link to the current version can be found on the footer of the NHC Homepage:
 * https://nhc.noaa.gov / https://www.nhc.noaa.gov/nhop.html
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoCoordinates, IWmoObject} from "../../WmoInterfaces.js";
import {IWmoDate, WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {IWmoMessage, WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export interface IUrxx10_11 extends IWmoMessage {
	observation: IUrxx10_11Observation;
	mission: IUrxx10_11Mission;
	remarks: IUrxx10_11Remarks;
}

export class URXX10_11 extends WmoMessage {

	public readonly observation: Urxx10_11Observation;
	public readonly mission: Urxx10_11Mission;
	public readonly remarks: Urxx10_11Remarks;

	public constructor(wmoFile: WmoFile) {
		super(wmoFile);

		// Helper parser variable
		const p = wmoFile.parser;
		
		// Parse mandatory observation line
		this.observation = new Urxx10_11Observation(p, wmoFile.header?.datetime);

		// Parse mission identifier
		this.mission = new Urxx10_11Mission(p);

		// Process remarks
		this.remarks = new Urxx10_11Remarks(p);

		// If there is still text, then throw error
		if (p.remainingLines() > 0)
			p.error('Expected end of Urxx10/11 after a ;');
	}
	
	public override toJSON(): IUrxx10_11 {
		return {
			observation: this.observation.toJSON(),
			mission: this.mission.toJSON(),
			remarks: this.remarks.toJSON()
		};
	}
}

export interface IUrxx10_11Observation {
	radar: number | null;
	time: IWmoDate | null;
	dewCap: number | null;
	day: number | null;
	qaud: number | null;
	pos: IWmoCoordinates | null;
	turb: number | null;
	flightCond: number | null;
	alt: number | null;
	windType: number | null;
	windMethod: number | null;
	windDir: number | null;
	windSpeed: number | null;
	temp: number | null;
	dew: number | null;
	weatherCond: number | null;
	psurLvl: number | null;
	psurVal: number | null;
	surfWinDir: number | null;
	surfWinSpd: number | null;
}

export class Urxx10_11Observation implements IWmoObject {

	public readonly radarCapability: number | null = null;
	public readonly observationDate: WmoDate | null = null;
	public readonly dewPointCapability: number | null = null;
	public readonly dayOfWeek: number | null = null;
	public readonly quadrant: number | null = null;
	public readonly coordinates: IWmoCoordinates | null = null;
	public readonly turbulence: number | null = null;
	public readonly flightCond: number | null = null;
	public readonly altitude: number | null = null;
	public readonly windType: number | null = null;
	public readonly windMethod: number | null = null;
	public readonly windDir: number | null = null;
	public readonly windSpeed: number | null = null;
	public readonly temperature: number | null = null;
	public readonly dewPoint: number | null = null;
	public readonly weatherCond: number | null = null;
	public readonly pressureLevel: number | null = null;
	public readonly pressureValue: number | null = null;
	public readonly surfaceWindDir: number | null = null;
	public readonly surfaceWindSpeed: number | null = null;

	public constructor(p: WmoParser, date: WmoDate | undefined) {
		/*
97779 13204_ 10295___ 565___18_ 305___0_0_ 22068 1008  9 /3051
9XXX9 GGggid YQLaLaLa LoLoLoBfc hahahadtda dddff TTTdTdw /jHHH

9XXX9 - Aircraft - 222 = with Radar | 555 = With or Without Radar | 777 = With Radar (Table 1 - Table G-3)
GG - Observation hours GMT
gg - Observation minutes GMT
id - Dew point capability [0-7] (Table 2 - Table G-2)

Y  - Day of week [1-7] (1 = sunday, 7 = Saturday)
Q  - Quadrant [0-3,5-8] (Table 3 - Table G-2 + Figure G-3)
La - Latitude as ##.# (use Q to know if + or -)

Lo - Longitude as ##.# (1 truncated from 100-180, Q of 2,3,6,7 means 1 if first is not a 9)
B  - Turbulence Measure [0-9] (Table 4 - Table G-2)
fc - Flight Conditions [089/] (Table 5 -Table G-2)

ha - Pressure Altitude
dt - Wind Observation type [01/] (Table 6 - Table G-2)
da - Wind Observation method [01/] (Table 7 - Table G-2)

ddd - Wind Direction (+/- 5 deg)
ff - Wind Speed (Kts) (note <10kt = 9905)

TT - Flight level temp
Td - Flight level dew point
w  - Flight weather conditions (Table 8 - Table G-2) [0-9/]

/j - Geopotential height level [0-9/] (Table 9 - Table G-2) OR surface pressure
HHH - Height/pressure value

(optional)
m - surface wind measurement method
swd - wind dir (tenth's dropped)
sws - wind speed (kt) (see Note 10 in Table G-4 for wind speeds above 130 kt)

(optional)
stm - surface temp measured
fv - visibility
stv - surface temp value
		 */
		const dl = p.assert(
			'Expected RECCO header line.',
			/^9(222|555|777)9\s+(\d{2}\d{2})([0-7\/])\s+([1-7\/])([0-35-8\/])([\d\/]{3})\s+([\d\/]{3})([\d\/])([089\/])\s+([\d\/]{3})([01\/])([01\/])\s+([\d\/]{3})([\d\/]{2})\s+([\d\/]{2})([\d\/]{2})([\d\/])\s+\/([\d\/])([\d\/]{3})(?:\s+([\d\/])([\d\/]{2})([\d\/]{2}))?(?:\s+([\d\/])([\d\/])([\d\/]{3}))?$/);
		//    9   1:XXX     9    2:GGgg     3:id        4:Yday   5:Quad      6:Lat         7:Lon      8:B     9:fc        10:ha      11:dt   12:da      13:ddd     14:ff         15:TT      16:Td      17:w         18:j    19:HHH NA        20:m    21:swd     21:sws        NA   22:stm  23:v    24:stv
		
		this.radarCapability = dl[1] === '222' ? -1 : (dl[1] === '777' ? 1 : 0);
		if (dl[2])
			this.observationDate = new WmoDate(dl[2] + 'Z', 'HHmmX', date);
		this.dewPointCapability = this.asInt(dl[3]);

		this.dayOfWeek = this.asInt(dl[4]);
		this.quadrant = this.asInt(dl[5]) ?? 0;

		if (dl[6] && dl[7]) {
			// 0-3 - North | 5-8 - South    | Q>4 = negative lat
			// 0+5 - 0-90W | 1+6 - 90W-180  | Q=0,1,5,6 = negative lon
			// 2+7 180-90E | 3-8 - 90-0E    | Q=1,2,6,7 AND Q<90 = 100+ lon
			this.coordinates = {
				lat: (this.asInt(dl[6]) ?? 0) / 10.0 * (this.quadrant > 4 ? -1 : 1),
				lon: (this.asInt(dl[7]) ?? 0) / 10.0 * ([0,1,5,6].indexOf(this.quadrant) >= 0 ? -1 : 1) + (this.quadrant < 90 && [1,2,6,7].indexOf(this.quadrant) ? 100 : 0),
			};
		}

		this.turbulence = this.asInt(dl[8]);
		this.flightCond = this.asInt(dl[9]);

		this.altitude  = this.asInt(dl[10]);
		this.windType = this.asInt(dl[11]);
		this.windMethod = this.asInt(dl[12]);
		this.windDir = this.asInt(dl[13]);
		this.windSpeed = this.asInt(dl[14]);

		this.temperature = this.asInt(dl[15]);
		this.dewPoint = this.asInt(dl[16]);
		this.weatherCond = this.asInt(dl[17]);

		this.pressureLevel = this.asInt(dl[18]);
		this.pressureValue = this.asInt(dl[19]);

		// See if the next line contains the surface data (KNHC)
		const sd = p.extract(/^(\d)(\d{2})(\d{2})$/);
		if (sd) {
			this.surfaceWindDir = this.asInt(sd[1]);
			this.surfaceWindSpeed = this.asInt(sd[2]);

		// Otherwise, if we have a 20 value, use that (KWBC)
		} else if (dl[20]) {
			this.surfaceWindDir = this.asInt(dl[21]);
			this.surfaceWindSpeed = this.asInt(dl[22]);
		}
	}

	private asInt(strVal: string | undefined): number | null {
		return strVal && strVal[0] !== '/' ? parseInt(strVal) : null;
	}
	
	public toJSON(): IUrxx10_11Observation {
		return {
			radar: this.radarCapability,
			time: this.observationDate?.toJSON() ?? null,
			dewCap: this.dewPointCapability,
			day: this.dayOfWeek,
			qaud: this.quadrant,
			pos: this.coordinates,
			turb: this.turbulence,
			flightCond: this.flightCond,
			alt: this.altitude,
			windType: this.windType,
			windMethod: this.windMethod,
			windDir: this.windDir,
			windSpeed: this.windSpeed,
			temp: this.temperature,
			dew: this.dewPoint,
			weatherCond: this.weatherCond,
			psurLvl: this.pressureLevel,
			psurVal: this.pressureValue,
			surfWinDir: this.surfaceWindDir,
			surfWinSpd: this.surfaceWindSpeed
		};
	}
}

export interface IUrxx10_11Mission {
	agency: string | null;
	aircraft: string | null;
	missionSeq: string | null;
	stormId: string | null;
	basin: string | null;
	name: string | null;
	obsNo: number | null;
}

export class Urxx10_11Mission implements IWmoObject {

	public readonly agency: string | null = null;
	public readonly aircraft: string | null = null;
	public readonly missionSeq: string | null = null;
	public readonly stormId: string | null = null;
	public readonly basin: string | null = null;
	public readonly name: string | null = null;
	public readonly obsNo: number;

	public constructor(p: WmoParser) {
		// Parse mission identifier line
		// RMK AF305 1511A JOAQUIN OB 13
		const idl = p.assert(
			'Expected mission identifier line',
			/^RMK\s+(NOAA|AF|UAS)(\w+)\s+(\d{2}|[A-Z]{2})(\d{2}|[A-Z]{2})([AECW])\s+(\w+)\s+OB\s+(\d+).*$/);
		//          1:agency         2:acft  3:misno         4:storm     5:basin    6:name       7:seq

		// Set agency and aircraft
		this.agency = idl[1] ?? null;
		this.aircraft = idl[2] ?? null;

		// Set storm number, mission number and basin
		this.missionSeq = idl[3] ?? null;
		this.stormId = idl[4] ?? null;
		this.basin = idl[5] ?? null;

		// Set storm name
		this.name = idl[6] ?? null;

		// Set sequence number
		this.obsNo = parseInt(idl[7] ?? '-1');
	}

	public toJSON(): IUrxx10_11Mission {
		return {
			agency: this.agency,
			aircraft: this.aircraft,
			missionSeq: this.missionSeq,
			stormId: this.stormId,
			basin: this.basin,
			name: this.name,
			obsNo: this.obsNo
		};
	}
}

export interface IUrxx10_11Remarks {
	text: string | null;
	sws: number | null;
	in: string | null;
	out: string | null;
	overland: boolean | null;
	estimated: boolean | null;
	last: boolean | null;
}

export class Urxx10_11Remarks implements IWmoObject {

	public readonly text: string | null = null;
	public readonly sws: number | null = null;
	public readonly inbound: string | null = null;
	public readonly outbound: string | null = null;
	public readonly overland: boolean = false;
	public readonly estimated: boolean = false;
	public readonly lastReport: boolean = false;

	public constructor(p: WmoParser) {
		// Continue to loop over the file to pull out common remarks, or add the remark text
		let l: string | undefined;
		while(true) {
			l = p.extract()?.at(0);

			// If nothing else or a semicolon, break
			if (!l || l === ';')
				break;

			// Add to plain-text
			this.text = this.text
				? `${this.text}\n${l}`
				: l;

			// See if the next line is Last Report, and break if so (expected to be last line)
			if (l.match(/^LAST REPORT$/)) {
				this.lastReport = true;

				// Skip ; if there
				p.extract(/;/);
				break;
			}

			// Check for a SWS SMFR surface wind measurement
			const sws = l.match(/^SWS\s*=\s*(\d+)\s*KTS$/);
			if (sws) {
				this.sws = sws[1] ? parseInt(sws[1]) : null;
				continue;
			}

			// Check for INBOUND or OUTBOUND messages
			const inout = l.match(/(IN|OUT)BOUND:?\s*(.*?)/)
			if (inout) {
				if (inout[1] === 'IN')
					this.inbound = inout[2] ?? null;
				else if (inout[1] === 'OUT')
					this.outbound = inout[2] ?? null;
				continue;
			}

			// Check for "OVERLAND"
			if (l.match(/^OVERLAND$/)) {
				this.overland = true;
				continue;
			}

			// Check for "estimated area"
			if (l.match(/ESTIMATED/) && l.match(/AREA/)) {
				this.estimated = true;
			}
		}
	}

	public toJSON(): IUrxx10_11Remarks {
		return {
			text: this.text,
			sws: this.sws,
			in: this.inbound,
			out: this.outbound,
			overland: this.overland,
			estimated: this.estimated,
			last: this.lastReport
		};
	}

}