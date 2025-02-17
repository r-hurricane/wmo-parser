/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the raw URNT10 / URNT11 Recon Observations messages.
 * Details can be found in the National Hurricane Operations Plan.
 * A link to the current version can be found on the footer of the NHC Homepage:
 * https://nhc.noaa.gov / https://www.nhc.noaa.gov/nhop.html
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoCoordinates, IWmoObject} from "../../WmoInterfaces.js";
import {WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export class URNT10_11 extends WmoMessage {

	public readonly observation: Urnt10_11Observation;
	public readonly remark: string;
	public readonly sws: number | null = null;
	public readonly lastReport: boolean = false;


	public constructor(wmoFile: WmoFile) {
		super(wmoFile);

		/*
			97779 13204 10295 56518 30500 22068 10089 /3051
			42045
			RMK AF305 1511A JOAQUIN OB 13
			SWS = 41KTS
		 */
		
		// Parse mandatory observation line
		this.observation = new Urnt10_11Observation(wmoFile.parser, wmoFile.header?.datetime);

		// Parse remark
		// TODO: Process remark values (i.e. aircraft, observation number, etc.)
		this.remark = wmoFile.parser.assert('Expected remark line', /^RMK.*/)[0];

		// See if the next line is the SWS SMFR surface wind measurement
		const sws = wmoFile.parser.extract(/^SWS\s*=\s*(\d+)\s*KTS$/);
		if (sws)
			this.sws = sws[1] ? parseInt(sws[1]) : null;

		// See if the next line is Last Report
		if (wmoFile.parser.extract(/^LAST REPORT$/))
			this.lastReport = true;
	}
	
	public override toJSON(): object {
		return {
			'obs': this.observation,
			'rmk': this.remark,
			'sws': this.sws,
			'last': this.lastReport
		};
	}
}

export class Urnt10_11Observation implements IWmoObject {

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
			/^9(222|555|777)9\s+(\d{2}\d{2})([0-7])\s+([1-7])([0-35-8])(\d{3})\s+(\d{3})(\d)([089\/])\s+(\d{3})([01\/])([01\/])\s+(\d{3})(\d{2})\s+(\d{2})(\d{2})([\d\/])\s+\/([\d\/])(\d{3})(?:\s+(\d)(\d{2})(\d{2}))?(?:\s+(\d)(\d)(\d{3}))?$/);
		//    9   1:XXX     9    2:GGgg     3:id      4:Yday 5:Quad    6:Lat     7:Lon  8:B 9:fc        10:ha  11:dt   12:da      13:ddd 14:ff     15:TT  16:Td  17:w         18:j    19:HHH NA   20:m 21:swd 21:sws   NA 22:stm 23:v 24:stv
		
		this.radarCapability = dl[1] === '222' ? -1 : (dl[1] === '777' ? 1 : 0);
		if (dl[2])
			this.observationDate = new WmoDate(dl[2], 'HHmm', date);
		this.dewPointCapability = this.asInt(dl[3]);

		this.dayOfWeek = this.asInt(dl[4]);
		this.quadrant = this.asInt(dl[5]);

		// TODO: Position based on quadrant
		if (dl[6] && dl[7]) {
			this.coordinates = {
				lat: (this.asInt(dl[6]) ?? 0) * 10,
				lon: (this.asInt(dl[7]) ?? 0) * 10
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

		// TODO: Set surface pressure if /0 vs /9
		this.pressureLevel = this.asInt(dl[18]);
		this.pressureValue = this.asInt(dl[19]);

		// See if the next line contains the surface data (KNHC)
		const sd = p.extract(/^(\d)(\d{2})(\d{2})$/);
		if (sd) {

		// Otherwise, if we have a 20 value, use that (KWBC)
		} else if (dl[20]) {

		}
	}

	private asInt(strVal: string | undefined): number | null {
		return strVal && strVal !== '/' ? parseInt(strVal) || null : null;
	}
	
	public toJSON(): object {
		return {
			'radar': this.radarCapability,
			'time': this.observationDate,
			'dewCap': this.dewPointCapability,
			'day': this.dayOfWeek,
			'pos': this.coordinates,
			'turb': this.turbulence,
			'flightCond': this.flightCond,
			'alt': this.altitude,
			'windType': this.windType,
			'windMethod': this.windMethod,
			'windDir': this.windDir,
			'windSpeed': this.windSpeed,
			'temp': this.temperature,
			'dew': this.dewPoint,
			'weatherCond': this.weatherCond,
			'psurLvl': this.pressureLevel,
			'psurVal': this.pressureValue,
		};
	}
}