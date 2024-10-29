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

	header = null;	
	atlantic = null;
	pacific = null;

	constructor(wmoFile) {
		super(wmoFile);
		
		// Parse header
		this.header = new Nous42Header(wmoFile.parser);
		
		// Parse Atlantic basin
		this.atlantic = new Nous42Basin(wmoFile.parser, 'I', this.header);
		
		// Parse Pacific basin
		//this.pacific = new Nous42Basin(wmoFile.parser, 'II', this.header);
	}
	
	toJSON() {
		return {
			'header': this.header,
			'atlantic': this.atlantic,
			'pacific': this.pacific
		};
	}
}

export class Nous42Header {
	
	issued = null;
	start = null;
	end = null;
	tcpod = null;
	correction = null;
	amendment = null;
	
	constructor(p) {
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

export class Nous42Basin {
	
	storms = [];
	outlook = null;
	remark = null;
	canceled = [];
	
	constructor(p, basinId, header) {
		// Extract the basin name
		const basinName = p.extract(`^${basinId}.\\s+(.*?) REQUIREMENTS$`);
		if (!basinName)
			p.error(`Expected basin with ID "${basinId}".`);
		
		// Process storms and missions
		this.processStorms(p);
		
		// Process outlook
		this.processOutlook(p);
		
		// Process optional remark
		this.processRemark(p, header);
	}
	
	processStorms(p) {
/*	
    1. HURRICANE OSCAR
       FLIGHT ONE - TEAL 75          FLIGHT TWO - TEAL 76
       A. 19/1700Z                   A. 20/1130Z,1730Z
       B. AFXXX 0216A OSCAR          B. AFXXX 0316A OSCAR
       C. 19/1530Z                   C. 20/0900Z
       D. 21.5N 70.5W                D. 21.2N 73.8W
       E. 19/1630Z TO 19/2000Z       E. 20/1100Z TO 20/1730Z
       F. SFC TO 10,000 FT           F. SFC TO 10,000 FT
       G. FIX                        G. FIX
       H. WRA ACTIVATION             H. WRA ACTIVATION
       I. RESOURCES PERMITTING       I. RESOURCES PERMITTING
*/
		// If the parser line is on a "negative recon" line, simply mark no missions
		if (p.extract(/1\. NEGATIVE RECONNAISSANCE REQUIREMENTS\./))
			return;
		
		// Extract missions for today (always expects a line with "\s*\d+. OUTLOOk" after)
		let nextLine;
		do {
			// TODO: Process storm and mission info
			console.log(p.extract());
			nextLine = p.currentLine();
			console.log('--------');
		} while (nextLine && !nextLine.match(/^\s*\d+\. OUTLOOK/));
	}
	
	processOutlook(p) {
		// If outlook is negative | 2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.
		if (p.currentLine().match(/NEGATIVE\.$/)) {
			this.outlook = {
				'negative': true,
				'text': p.extract()
			};
			return;
		}
		
		// Othersise, get full outlook text
		// 2. OUTLOOK FOR SUCCEEDING DAY: CONTINUE 6-HRLY FIXES IF SYSTEM
        //    REMAINS A THREAT.
		let text = p.extract(/\d+\. OUTLOOK FOR SUCCEEDING DAY: (.*$)/, true, false)[1];
		
		// Loop until line next line is either empty OR starts with \s*\d+\. (#.)
		let nextLine = p.currentLine();
		while (nextLine && nextLine.trim() !== '' && !nextLine.match(/^\s*\d+\./)) {
			text += ' ' + p.extract(/^.*$/, true, false);
			nextLine = p.currentLine();
		}
		p.skipEmpty();
		
		// Set outlook
		this.outlook = {
			'negative': false,
			'text': text
		};
	}
	
	processRemark(p, header) {
/*
    3. REMARK: ALL REMAINING TASKING FOR SUSPECT AREA AL94 IN TCPODS
       24-138 AND 24-139 WAS CANCELED BY NHC AT 18/1330Z.
*/
		const remark = p.extract(/\d+\. REMARK: (.*)$/, true, false);
		if (!remark)
			return;
		
		let text = remark[1];
		
		// Loop until line next line is either empty OR the start of the next basin
		let nextLine = p.currentLine();
		while (nextLine && nextLine.trim() !== '' && !nextLine.match(/^\s*I+\./)) {
			text += ' ' + p.extract(/^.*$/, true, false);
			nextLine = p.currentLine();
		}
		p.skipEmpty();
		
		// Set remark
		this.remark = text;
		
		// Detect if remark canceled all flights for specific TCPODs
		const call = text.match(/^ALL REMAINING TASKING .*? IN TCPODS?\s*(\d+-\d+)(?: AND (\d+-\d+))? WAS CANCELED BY .*? AT (\d+)\/(\d+)Z/i);
		if (call) {
			this.canceled.push({'tcpod': call[1]});
			if (call[2] && call[2].length > 0)
				this.canceled.push({'tcpod': call[2]});
			return;
		}
		
		// Otherwise, check if a specific flight was canceled
		const match = text.match(/THE (.*?) MISSION INTO .*?(?:\sTASKED IN TCPOD\s*((\d+)-(\d+))|\sFOR THE (\d+)\/(\d+)Z(?:,|\s+AND\s+)(?:(\d+)\/)?(\d+)Z(?: FIX)? REQUIREMENTS)+ WAS CANCELED BY .*? AT (\d+)\/(\d+)Z/i);
		if (!match)
			return;
		
		const tcpodDate = header.issued;
		
		this.canceled.push({
			'mission': match[1],
			'tcpod': match[2],
			'tcpodYr': match[3],
			'tcpodSeq': match[4],
			'required': (
				match[5]
					? {
						'start': new WmoDate(`${match[5]} ${match[6]}z`, 'dd HHmmX', tcpodDate),
						'end': match[8] 
						? new WmoDate(`${match[7] || match[5]} ${match[8]}Z`, 'dd HHmmX', tcpodDate)
						: null
					}
					: null
			),
			'canceledAt': new WmoDate(`${match[9]} ${match[10]}Z`, 'dd HHmmX', tcpodDate)
		});
	}
	
	toJSON() {
		return {
			'storms': this.storms,
			'outlook': this.outlook,
			'remark': this.remark,
			'canceled': this.canceled
		};
	}
}