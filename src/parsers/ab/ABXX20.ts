/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the Tropical Weather Outlooks (TWO).
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoObject} from "../../WmoInterfaces.js";
import {WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export class ABXX20 extends WmoMessage {

	public readonly issuedBy: string;
	public readonly issuedOn: WmoDate;
	public readonly for: string;
	public readonly active: string | null = null;
	public readonly areasOfInterest: AbxxAreaOfInterest[] = [];
	public readonly remark: string | null = null;

	public constructor(wmoFile: WmoFile) {
		super(wmoFile);

		// Skip "Tropical Weather Outlook" line
		const p = wmoFile.parser;
		p.extract(/Tropical Weather Outlook/);

		// Get issued by line
		// NWS National Hurricane Center Miami FL
		this.issuedBy = p.assert('Expected TWO issued by line')[0];

		// Parse issued date
		// 200 AM EDT Fri Oct 18 2024
		const headerDate = p.assert('Expected date line')[0];
		this.issuedOn = new WmoDate(headerDate, 'hmm a XXX EEE MMM dd yyyy');
		
		// For the North Atlantic...Caribbean Sea and the Gulf of Mexico:
		this.for = p.assert('Expected TWO "for" line')[0];

		// If next line starts with "Active Systems:"
		const activeLine = p.extract(/Active Systems:/);
		if (activeLine) {
			this.active = p.extractUntil(/^$/, ' ', true, false);
		}
		p.skipEmpty();

		// Extract storms
		let next = p.peek();
		while(next && next.match(/^\s*\d+\..*$/)) {
			this.areasOfInterest.push(new AbxxAreaOfInterest(p));
			next = p.peek();
		}

		// Extract any additional remarks
		this.remark = p.extractUntil(/\$\$/);
	}
	
	public override toJSON(): object {
		return {
			'issuedBy': this.issuedBy,
			'issuedOn': this.issuedOn,
			'for': this.for,
			'active': this.active,
			'areas': this.areasOfInterest,
			'remark': this.remark
		};
	}
}

export interface IFormationChance {
	level: string;
	chance: number
}

export class AbxxAreaOfInterest implements IWmoObject {
	
	public readonly title: string | null = null;
	public readonly id: string | null = null;
	public readonly text: string | null = null;
	public readonly twoDay: IFormationChance | null = null;
	public readonly sevenDay: IFormationChance | null = null;

	public constructor(p: WmoParser) {
		// Extract title (and optional id)
		const titleLine = p.assert('Expected storm title line', /^\s*\d+\.\s+(.*?)(?:\s+\((.*?)\))?$/);
		this.title = titleLine[1] ?? null;
		this.id = titleLine[2] ?? null;

		// Extract text until first * line
		this.text = p.extractUntil(/^\s*\*.*$/);

		// Extract 2 day and 7 day chances
		this.twoDay = this.extractChance(p, 2);
		this.sevenDay = this.extractChance(p, 7);
	}

	private extractChance(p: WmoParser, days: number): IFormationChance {

		// * Formation chance through 48 hours...low...30 percent.
		// * Formation chance through 7 days...high...70 percent.

		const exp = days === 2 ? '48\\s+hours' : `${days}\\s+days`;
		const match = p.assert('Expected ' + days + '-day chance line',
			new RegExp('\\s*\\*.*' + exp + '\\.+(.*?)\\.+(\\d+)\\s+percent'));
		return {
			level: match[1] ?? 'unknown',
			chance: parseInt(match[2] ?? 'NaN')
		};
	}
	
	public toJSON(): object {
		return {
			'title': this.title,
			'id': this.id,
			'text': this.text,
			'twoDay': this.twoDay,
			'sevenDay': this.sevenDay
		};
	}
}
