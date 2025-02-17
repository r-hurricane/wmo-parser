/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the NOUS42 Tropical Cyclone Plan of thr Day.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoCoordinates, IWmoObject} from "../../WmoInterfaces.js";
import {IWmoDateRange, WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export class NOUS42 extends WmoMessage {

    public readonly header?: Nous42Header;
    public readonly atlantic?: Nous42Basin;
    public readonly pacific?: Nous42Basin;
    public readonly note?: string | null;

    constructor(wmoFile: WmoFile) {
        super(wmoFile);

        // Parse header
        this.header = new Nous42Header(wmoFile.parser);

        // Parse Atlantic basin
        this.atlantic = new Nous42Basin(wmoFile.parser, 'I', this.header);

        // Parse Pacific basin
        this.pacific = new Nous42Basin(wmoFile.parser, 'II', this.header);

        // Parse potential note
        const noteLine = wmoFile.parser.extract(/NOTE: (.+)$/);
        if (!noteLine)
            return;

        // Set note text
        this.note = noteLine[1] ?? null;

        // Continue note text until literal $$
        let nextLine = wmoFile.parser.peek();
        while(nextLine && !nextLine.match(/\$\$/)) {
            this.note += ' ' + wmoFile.parser.extract(/^.*$/);
            nextLine = wmoFile.parser.peek();
        }
    }

    public override toJSON(): object {
        return {
            'header': this.header,
            'atlantic': this.atlantic,
            'pacific': this.pacific,
            'note': this.note
        };
    }
}

export interface INous42HeaderTcpod {
    full: string | null;
    yr: string | null;
    seq: string | null;
}

export class Nous42Header implements IWmoObject {

    public readonly awips?: string | undefined;
    public readonly issued?: WmoDate | undefined;
    public readonly start?: WmoDate | undefined;
    public readonly end?: WmoDate | undefined;
    public readonly tcpod?: INous42HeaderTcpod | undefined;
    public readonly correction?: boolean | undefined;
    public readonly amendment?: boolean | undefined;

    constructor(p: WmoParser) {
        // Extract the AWIPS product type (REPRPD)
        const awips = p.extract(/^REPRPD$/);
        this.awips = awips && awips[0];

        // Skip first few header lines
        p.extract(/^WEATHER RECONNAISSANCE FLIGHTS$/);
        p.extract(/NATIONAL HURRICANE CENTER/);

        // Extract date info
        const dateLine = p.extract();
        if (!dateLine)
            p.error('Expected date line, but nothing found');

        // Parse issued date
        // NHC Bug? 12AM or PM seems to come in as 0 not 12, but 1 comes as 01...
        let headerDate = dateLine[0];
        if (headerDate[0] === '0' && headerDate[3] == ' ')
            headerDate = '12' + headerDate.substring(1);
        this.issued = new WmoDate(headerDate, 'hhmm a XXX EEE dd MMMM yyyy');

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
            full: tcpodNo[1] ?? null,
            yr: tcpodNo[2] ?? null,
            seq: tcpodNo[3] ?? null
        };
        this.correction = !!tcpodNo[4];
        this.amendment = !!tcpodNo[5];
    }

    public toJSON(): object {
        return {
            'awips': this.awips ?? null,
            'issued': this.issued ?? null,
            'start': this.start ?? null,
            'end': this.end ?? null,
            'tcpod': this.tcpod ?? null,
            'correction': this.correction ?? null,
            'amendment': this.amendment ?? null
        };
    }
}

export interface INous42Outlook {
    negative: boolean;
    text: string;
}

export interface INous42Canceled {
    tcpod: string | null;
    mission?: string | undefined;
    tcpodYr?: string | undefined;
    tcpodSeq?: string | undefined;
    required?: IWmoDateRange | undefined;
    canceledAt?: WmoDate | undefined;
}

export class Nous42Basin implements IWmoObject {

    public readonly storms: Nous42Storm[] = [];
    public readonly outlook: INous42Outlook[] = [];
    public readonly remarks: string[] = [];
    public readonly canceled: INous42Canceled[] = [];

    constructor(p: WmoParser, basinId: string, header: Nous42Header) {
        // Extract the basin name
        const basinName = p.extract(new RegExp(`^${basinId}.\\s+(.*?) REQUIREMENTS$`));
        if (!basinName)
            p.error(`Expected basin with ID "${basinId}".`);

        // Process storms and missions
        this.processStorms(p, header);

        // Process outlook
        this.processOutlook(p);

        // Process optional remark
        this.processRemark(p, header);
    }

    processStorms(p: WmoParser, header: Nous42Header) {
        // If the parser line is on a "negative recon" line, simply mark no missions
        if (p.extract(/1\. NEGATIVE RECONNAISSANCE REQUIREMENTS\./))
            return;

        // Extract missions for today (always expects a line with "\s*\d+. OUTLOOK" after)
        let nextLine;
        do {
            this.storms.push(new Nous42Storm(p, header));
            nextLine = p.peek();
        } while (nextLine && !nextLine.match(/^\s*\d+\. OUTLOOK/));
    }

    processOutlook(p: WmoParser) {
        // Get outlook line
        let outlookLine = p.extract(/\d+\. OUTLOOK FOR SUCCEEDING DAY(?::|\.+)(.*)$/);
        if (!outlookLine || !outlookLine[1])
            p.error('Expected basin outlook line');

        // If outlook is negative, simply return with one outlook
        let text = outlookLine[1].trim();
        if (text.indexOf('NEGATIVE') >= 0) {
            this.outlook.push({
                negative: true,
                text: text
            });
            return;
        }

        // Loop until we find the next Remark (#.), Basin (II+.), NOTE, or literal $$
        let nextLine = p.peek();
        do {
            // Extract the starting line
            let multiStart = p.extract(/^\s*[A-Z]\. (.+)$/);
            if (multiStart && multiStart[1])
                text = multiStart[1];

            // Loop until either the next ones mentioned above OR another outlook line [A-Z].
            nextLine = p.peek();
            while (nextLine && !nextLine.match(/^\s*([A-Z]\.|\d+\.|II+\.|NOTE:|\$\$)/)) {
                text += ' ' + p.extract(/^.*$/);
                nextLine = p.peek();
            }

            // Add to the outlook list
            this.outlook.push({
                negative: false,
                text: text
            });

        } while (nextLine && !nextLine.match(/^\s*(\d+\.|II+\.|NOTE:|\$\$)/));
    }

    processRemark(p: WmoParser, header: Nous42Header) {
        // Get the initial remark text (optional)
        const remark = p.extract(/\d+\. REMARKS?:(.*)$/, true, false);
        if (!remark || !remark[1])
            return;

        let text = remark[1].trim();

        // Loop until we find the next Remark ([A-Z].), Basin (II+.), NOTE, or literal $$
        let nextLine = p.peek();
        do {
            // Extract the starting line
            let multiStart = p.extract(/^\s*[A-Z]\. (.+)$/);
            if (multiStart && multiStart[1])
                text = multiStart[1];

            // Loop until either the next ones mentioned above OR another outlook line [A-Z].
            nextLine = p.peek();
            while (nextLine && !nextLine.match(/^\s*([A-Z]\.|II+\.|NOTE:|\$\$)/)) {
                text += ' ' + p.extract(/^.*$/);
                nextLine = p.peek();
            }

            // Add to the outlook list
            this.remarks.push(text);

            // Process the cancellations
            this.processRemarkCancellations(text, header);

        } while (nextLine && !nextLine.match(/^\s*(II+\.|NOTE:|\$\$)/));
    }

    processRemarkCancellations(text: string, header: Nous42Header) {
        // Detect if remark canceled all flights for specific TCPODs
        const call = text.match(/^ALL REMAINING TASK(?:ING|S) .*? IN TCPODS?\s*(\d+-\d+)(?: AND (\d+-\d+))? WAS CANCELED BY .*? AT (\d+)\/(\d+)Z/i);
        if (call) {
            this.canceled.push({tcpod: call[1] ?? null});
            if (call[2] && call[2].length > 0)
                this.canceled.push({tcpod: call[2]});
            return;
        }

        // Otherwise, check if a specific flight was canceled
        const match = text.match(/THE (.*?) MISSIONS? .*?\s(?=.*IN TCPOD\s*((\d+)-(\d+)))(?=.*FOR.*? (\d+)\/(\d+)Z(?:,|\s+AND\s+)(?:(\d+)\/)?(\d+)Z).*CANCELED BY .*? AT (\d+)\/(\d+)Z/i);
        if (!match)
            return;

        const tcpodDate = header.issued;

        this.canceled.push({
            mission: match[1],
            tcpod: match[2] ?? null,
            tcpodYr: match[3],
            tcpodSeq: match[4],
            required: (
                match[5]
                    ? {
                        start: new WmoDate(`${match[5]} ${match[6]}Z`, 'dd HHmmX', tcpodDate),
                        end: match[8]
                            ? new WmoDate(`${match[7] || match[5]} ${match[8]}Z`, 'dd HHmmX', tcpodDate)
                            : null
                    }
                    : undefined
            ),
            canceledAt: new WmoDate(`${match[9]} ${match[10]}Z`, 'dd HHmmX', tcpodDate)
        });
    }

    public toJSON(): object {
        return {
            'storms': this.storms ?? null,
            'outlook': this.outlook ?? null,
            'remarks': this.remarks ?? null,
            'canceled': this.canceled ?? null
        };
    }
}

export class Nous42Storm implements IWmoObject {

    public readonly name: string;
    public readonly missions: Nous42Mission[] = [];

    constructor(p: WmoParser, header: Nous42Header) {
        // Extract out the storm name
        const rawStormLine = p.extract(/^\s*\d+\.\s+(.+)$/);
        if (!rawStormLine || !rawStormLine[1])
            p.error('Expected a storm name, but it was not found.');

        // Normalize storm name
        this.name = rawStormLine[1];
        const normSearch = rawStormLine[1].match(/^((HURRICANE|TROPICAL STORM|TROPICAL DEPRESSION) (.+)|SUSPECT AREA \((.+)\))$/);
        if (normSearch)
            this.name = normSearch[3] || normSearch[4] || rawStormLine[1];

        // Process storm and mission info
        let nextLine;
        do {
            this.processMissions(p, header);
            nextLine = p.peek();
        } while (nextLine && !nextLine.match(/^\s*\d+\./));
    }

    processMissions(p: WmoParser, header: Nous42Header) {
        // Get Flight Info
        // Group 0 - Full match line
        // Group 1 - Flight Name
        // Group 2 - End or optional flight separation
        const flights = p.extractAll(/FLIGHT[^-]+-\s+(.+?)($|\s{2})/g);
        if (!flights)
            p.error('Expected a Flight Name line (FLIGHT ONE - CALLSIGN 123)');

        // A. Determine the required fix times (times required to be in storm)
        // Group 0 - Full match of line
        // Group 1 - Fix start date
        // Group 2 - Fix start time
        // Group 3 - Fix optional end full match
        // Group 4 - Fix end optional date full match
        // Group 5 - Fix end optional date
        // Group 6 - Fix end time
        // Group 7 - Optional second flight separation
        const requiredDates = p.extractAll(/A\. (\d+)\/(\d+)Z(,((\d+)\/)?(\d+)Z)?($|\s{2})/g);
        if (!requiredDates)
            p.error('Expected a Flight A. Data Line');

        // B. Flight Identifier
        // Group 0 - Full match of line
        // Group 1 - Identifier text
        // Group 2 - Optional second flight separation
        const missionIdentifiers = p.extractAll(/B\. (.*?)($|\s{2})/g);
        if (!missionIdentifiers)
            p.error('Expected a Flight B. Data Line');

        // C. Estimated departure date/time
        // Group 0 - Full match of line
        // Group 1 - Departure date
        // Group 2 - Departure time
        // Group 3 - Optional second flight separation
        const departures = p.extractAll(/C\. (\d{2})\/(\d{4})Z($|\s{2})/g);
        if (!departures)
            p.error('Expected a Flight C. Data Line');

        // D. Target Coordinates
        // Group 0 - Full match of line
        // Group 1 - Latitude Number
        // Group 2 - Latitude N or S
        // Group 3 - Longitude Number
        // Group 4 - Longitude E or W
        // Group 5 - Optional second flight separation
        const coordinates = p.extractAll(/D\. (?:(\d+\.\d+)([NS]) (\d+\.\d+)([EW])|(NA))($|\s{2})/g);
        if (!coordinates)
            p.error('Expected a Flight D. Data Line');

        // E. Fix window
        // Group 0 - Full match of line
        // Group 1 - Window Start Date
        // Group 2 - Window Start Time
        // Group 3 - Window End Date
        // Group 4 - Window End Time
        // Group 5 - Optional second flight separation
        const fixWindows = p.extractAll(/E\. (?:(\d{2})\/(\d{4})Z TO (\d{2})\/(\d{4})Z|(NA))($|\s{2})/g);
        if (!fixWindows)
            p.error('Expected a Flight E. Data Line');

        // F. Flight altitude(s)
        // Group 0 - Full match of line
        // Group 1 - Altitude in feet (note includes comma)
        // Group 2 - Optional second flight separation
        const altitudes = p.extractAll(/F\. (SFC|[\d,]+) TO ([\d,]+) FT($|\s{2})/g);
        if (!altitudes)
            p.error('Expected a Flight F. Data Line');

        // G. Mission Profile
        // Group 0 - Full match of line
        // Group 1 - Profile text
        // Group 2 - Optional second flight separation
        const profiles = p.extractAll(/G\. (.*?)($|\s{2})/g);
        if (!profiles)
            p.error('Expected a Flight G. Data Line');

        // H. Area Activation Status
        // Group 0 - Full match of line
        // Group 1 - Match on NO
        // Group 2 - Match on status text
        // Group 3 - Optional second flight separation
        const activationStatuses = p.extractAll(/H\. (NO)?\s?(.*?)($|\s{2})/g);
        if (!activationStatuses)
            p.error('Expected a Flight H. Data Line');

        // I. Remarks (optional)
        // Group 0 - Full match of line
        // Group 1 - Remark text
        // Group 2 - Optional second flight separation
        const remarks = p.extractAll(/I\. (.*?)($|\s{2})/g);

        // For each flight, create a mission object
        for (let i=0; i<flights.length; ++i) {
            this.missions.push(new Nous42Mission(header, {
                flight: flights[i],
                required: requiredDates[i],
                id: missionIdentifiers[i],
                departure: departures[i],
                coordinates: coordinates[i],
                fixWindow: fixWindows[i],
                altitude: altitudes[i],
                profile: profiles[i],
                activationStatus: activationStatuses[i],
                remarks: remarks && remarks.length > i ? remarks[i] : undefined
            }));
        }
    }

    public toJSON(): object {
        return {
            'name': this.name ?? null,
            'missions': this.missions ?? null
        };
    }
}

export interface INous42Altitude {
    upper: number | null;
    lower: number | null;
}

export class Nous42Mission implements IWmoObject{

    public readonly tcpod: INous42HeaderTcpod | undefined;
    public readonly name: string | undefined;
    public readonly required: IWmoDateRange | undefined;
    public readonly id: string | undefined;
    public readonly departure: WmoDate | undefined;
    public readonly coordinates: IWmoCoordinates | undefined;
    public readonly window: IWmoDateRange | undefined;
    public readonly altitude: INous42Altitude | undefined;
    public readonly profile: string | undefined;
    public readonly wra: boolean | undefined;
    public readonly remarks: string | undefined;

    constructor(header: Nous42Header, matches: {[key: string]: RegExpExecArray | undefined}) {
        const {
            flight,
            required,
            id,
            departure,
            coordinates,
            fixWindow,
            altitude,
            profile,
            activationStatus,
            remarks
        } = matches;
        const tcpodDate = header.issued;

        this.tcpod = header.tcpod;
        this.name = flight && flight[1];

        if (required) {
            this.required = {
                start: new WmoDate(`${required[1]} ${required[2]}Z`, 'dd HHmmX', tcpodDate),
                end: required[3]
                    ? new WmoDate(`${required[5] || required[1]} ${required[6]}Z`, 'dd HHmmX', tcpodDate)
                    : null
            };
        }

        this.id = id && id[1];

        if (departure)
            this.departure = new WmoDate(`${departure[1]} ${departure[2]}Z`, 'dd HHmmX', tcpodDate);

        if (coordinates && coordinates[5] !== 'NA')
        {
            this.coordinates = {
                'lat': parseFloat(coordinates[1] ?? '0.0') * (coordinates[2] === 'N' ? 1 : -1),
                'lon': parseFloat(coordinates[3] ?? '0.0') * (coordinates[4] === 'E' ? 1 : -1)
            };
        }

        if (fixWindow && fixWindow[5] !== 'NA') {
            this.window = {
                start: new WmoDate(`${fixWindow[1]} ${fixWindow[2]}Z`, 'dd HHmmX', tcpodDate),
                end: new WmoDate(`${fixWindow[3]} ${fixWindow[4]}Z`, 'dd HHmmX', tcpodDate)
            };
        }

        if (altitude) {
            this.altitude = {
                lower: !altitude[1] ? null : (altitude[1] === 'SFC' ? 0 : parseInt(altitude[1].replace(',', ''))),
                upper: !altitude[2] ? null : parseInt(altitude[2].replace(',', ''))
            };
        }

        this.profile = profile && profile[1];
        this.wra = activationStatus && activationStatus[1] !== 'NO';
        this.remarks = remarks && remarks[1];
    }

    public toJSON(): object {
        return {
            'tcpod': this.tcpod ?? null,
            'name': this.name ?? null,
            'required': this.required ?? null,
            'id': this.id ?? null,
            'departure': this.departure ?? null,
            'coordinates': this.coordinates ?? null,
            'window': this.window ?? null,
            'altitude': this.altitude ?? null,
            'profile': this.profile ?? null,
            'wra': this.wra ?? null,
            'remarks': this.remarks ?? null
        };
    }
}