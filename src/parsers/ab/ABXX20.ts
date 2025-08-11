/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the Tropical Weather Outlooks (TWO).
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoObject} from "../../WmoInterfaces.js";
import {IWmoDate, WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {IWmoMessage, WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export interface IAbxx20 extends IWmoMessage {
	issuedBy: string;
	issuedOn: IWmoDate | null;
	for: string;
	active: string | null;
	areas: IAbxx20AreaOfInterest[];
	remark: string | null;
}

export class ABXX20 extends WmoMessage {

	public readonly issuedBy: string;
	public readonly issuedOn: WmoDate;
	public readonly for: string;
	public readonly active: string | null = null;
	public readonly areasOfInterest: Abxx20AreaOfInterest[] = [];
	public readonly remark: string | null = null;

	public constructor(wmoFile: WmoFile) {
		super(wmoFile);

		// Skip "Tropical Weather Outlook" line
		const p = wmoFile.parser;
		p.extract(/Tropical Weather Outlook/);

		// Get issued by line
		// NWS National Hurricane Center Miami FL
		this.issuedBy = p.assert('Expected TWO issued by line')[0];

		// Sometimes there is a separate issued by
		const secondaryIssuedBy = p.extract(/Issued by (.*?)$/);
		if (secondaryIssuedBy && secondaryIssuedBy[1])
			this.issuedBy = secondaryIssuedBy[1];

		// Parse issued date
		// 200 AM EDT Fri Oct 18 2024
		const headerDate = p.assert('Expected date line')[0];
		this.issuedOn = new WmoDate(headerDate, 'hmm a XXX EEE MMM dd yyyy');
		
		// For the North Atlantic...Caribbean Sea and the Gulf of Mexico:
		this.for = p.extractUntil(/^For the.*$/);
		this.for += p.assert('Expected TWO "for" line', /^For the.*$/)[0];

		// If next line starts with "Active Systems:"
		const activeLine = p.extract(/Active Systems:/);
		if (activeLine) {
			this.active = p.extractUntil(/^$/, ' ', true, false);
		}
		p.skipEmpty();

		// Extract prefaced additional remarks
		this.remark = p.extractUntil(/^\s*\d+\..*$/);

		// Extract storms
		let next = p.peek();
		while(next && next.match(/^\s*\d+\..*$/)) {
			this.areasOfInterest.push(new Abxx20AreaOfInterest(p));
			next = p.peek();
		}

		// Extract any additional remarks
		const addRemark = p.extractUntil(/\$\$/);
		if (addRemark && addRemark.length > 0) {
			this.remark = this.remark && this.remark.length > 0
				? `${this.remark} ${addRemark}`
				: addRemark;
		}
	}
	
	public override toJSON(): IAbxx20 {
		return {
			issuedBy: this.issuedBy,
			issuedOn: this.issuedOn.toJSON(),
			for: this.for,
			active: this.active,
			areas: this.areasOfInterest.map(a => a.toJSON()),
			remark: this.remark
		};
	}
}

export interface IFormationChance {
	level: string;
	chance: number
}

export interface IAbxx20AreaOfInterest {
	title: string | null;
	id: string | null;
	text: string | null;
	twoDay: IFormationChance | null;
	sevenDay: IFormationChance | null;
}

export class Abxx20AreaOfInterest implements IWmoObject {
	
	public readonly title: string | null = null;
	public readonly id: string | null = null;
	public readonly text: string | null = null;
	public readonly twoDay: IFormationChance | null = null;
	public readonly sevenDay: IFormationChance | null = null;

	public constructor(p: WmoParser) {
		// Extract title (and optional id)
		const titleLine = p.assert('Expected storm title line', /^\s*\d+\.\s+(.*?)(?:\s+\((.*?)\))?:?\s*$/);
		this.title = titleLine[1] ?? null;
		this.id = titleLine[2] ?? null;

		// Extract text until first * line
		this.text = p.extractUntil(/^.*\*\s*Formation.*$/);

		// Extract 2 day and 7 day chances
		this.twoDay = this.extractChance(p, 2);
		this.sevenDay = this.extractChance(p, 7);
	}

	private extractChance(p: WmoParser, days: number): IFormationChance {

		// * Formation chance through 48 hours...low...30 percent.
		// * Formation chance through 7 days...high...70 percent.

		const exp = days === 2 ? '48\\s+hours' : `${days}\\s+days`;
		const match = p.assert('Expected ' + days + '-day chance line',
			new RegExp('\\s*\\*.*' + exp + '\\.+(.*?)\\.+\\s*(?:near\\s+)?(\\d+)\\s+percent'));
		return {
			level: match[1] ?? 'unknown',
			chance: parseInt(match[2] ?? 'NaN')
		};
	}
	
	public toJSON(): IAbxx20AreaOfInterest {
		return {
			title: this.title,
			id: this.id,
			text: this.text,
			twoDay: this.twoDay,
			sevenDay: this.sevenDay
		};
	}
}
