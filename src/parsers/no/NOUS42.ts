/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses the NOUS42 Tropical Cyclone Plan of thr Day. Details can be found in the National Hurricane Operations Plan.
 * A link to the current version can be found on the footer of the NHC Homepage:
 * https://nhc.noaa.gov / https://www.nhc.noaa.gov/nhop.html
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoCoordinates, IWmoObject} from "../../WmoInterfaces.js";
import {IWmoDate, IWmoDateRange, WmoDate} from '../../WmoDate.js';
import {WmoFile} from "../../WmoFile.js";
import {IWmoMessage, WmoMessage} from '../../WmoMessage.js';
import {WmoParser} from "../../WmoParser.js";

export interface INous42 extends IWmoMessage {
    header: INous42Header | null;
    atlantic: INous42Basin | null;
    pacific: INous42Basin | null;
    note: string | null;
}

export class NOUS42 extends WmoMessage {

    public readonly header: Nous42Header;
    public readonly atlantic: Nous42Basin;
    public readonly pacific: Nous42Basin;
    public readonly note: string | null = null;

    constructor(wmoFile: WmoFile) {
        super(wmoFile);

        // Parse header
        this.header = new Nous42Header(wmoFile.parser);

        // Parse Atlantic basin
        this.atlantic = new Nous42Basin(wmoFile.parser, 'I', this.header);

        // Parse Pacific basin, which may not exist
        this.pacific = new Nous42Basin(wmoFile.parser, 'II', this.header);

        // Parse potential note
        const noteLine = wmoFile.parser.extract(/NOTE: (.+)$/);
        if (!noteLine || !noteLine[1])
            return;

        // Set note text
        this.note = noteLine[1] + wmoFile.parser.extractUntil(/\$\$/);
    }

    public override toJSON(): INous42 {
        return {
            header: this.header.toJSON(),
            atlantic: this.atlantic.toJSON(),
            pacific: this.pacific.toJSON(),
            note: this.note
        };
    }
}

export interface INous42HeaderTcpod {
    full: string | null;
    tc: boolean,
    yr: string | null;
    seq: string | null;
}

export interface INous42Header {
    awips: string | null;
    issued: IWmoDate | null;
    start: IWmoDate | null;
    end: IWmoDate | null;
    tcpod: INous42HeaderTcpod | null;
    correction: boolean | null;
    amendment: boolean | null;
    remark: string | null;
}

export class Nous42Header implements IWmoObject {

    public readonly awips: string | null;
    public readonly issued: WmoDate;
    public readonly start: WmoDate;
    public readonly end: WmoDate;
    public readonly tcpod: INous42HeaderTcpod;
    public readonly correction: boolean;
    public readonly amendment: boolean;
    public readonly remark: string;

    constructor(p: WmoParser) {
        // Extract the AWIPS product type (REPRPD)
        const awips = p.extract(/^REPRPD$/);
        this.awips = awips ? awips[0] : null;

        // Skip first few header lines
        p.extract(/^WEATHER RECONNAISSANCE FLIGHTS$/);
        p.extract(/NATIONAL HURRICANE CENTER/);

        // Extract date info
        const dateLine = p.assert('Expected date line, but nothing found');

        // NHC Bug? 12AM or PM seems to come in as 0 not 12, but 1 comes as 01...
        let headerDate = dateLine[0];
        if (headerDate[0] === '0' && headerDate[3] == ' ')
            headerDate = '12' + headerDate.substring(1);

        // Date-fns limitation - Sometimes the date is 1300 PM, which date-fns doesn't like having a 24 hour + AM/PM
        const headerHour = parseInt(headerDate.substring(0, 2)) - 12;
        if (headerHour > 0)
            headerDate = (headerHour < 10 ? '0' + headerHour : headerHour) + headerDate.substring(2);

        // Parse issued date
        this.issued = new WmoDate(headerDate, 'hhmm a XXX EEE dd MMMM yyyy');

        // Skip subject line
        p.extract(/^SUBJECT:/);

        // Extract valid dates
        const validRange = p.assert(
            'Expected TCPOD valid line "VALID ##/####Z TO ##/####Z MONTHNAME 20##"',
            /VALID (\d{2})\/(\d{4}Z?)(?:\s+\w+)? TO (\d{2})\/(\d{4}Z?) (\w+) (\d{4})/);
        //   VALID 1:DAY  / 2:TIME   NA:MONTH    TO 3:DAY  / 4:TIME    5:MON 6:YEAR

        // First, parse the end date, since it may be needed for the start date context
        this.end = new WmoDate(`${validRange[4]} ${validRange[3]} ${validRange[5]} ${validRange[6]}`, 'HHmmX dd MMMM yyyy');

        // If the end date is the start of a month, use the issued date as the date context for the start date
        this.start = new WmoDate(`${validRange[2]} ${validRange[1]}`, 'HHmmX dd',
            validRange[3] === '01' ? this.issued : this.end);

        // Extract TCPOD number
        const tcpodNo = p.assert(
            'Expected TCPOD NUMBER line "NUMBER...##-###( CORRECTION| AMENDMENT)?"',
            /(?:(WS|TC)POD )?NUMBER\.*((\d+)-(\d+))( CORRECTION)?( AMENDMENT)?/);
        //   1:TYPE POD NUMBER...2:3:YY-4:SEQ 5:CORRECTION  6:AMENDMENT
        this.tcpod = {
            full: `${tcpodNo[1] ?? 'TCPOD'}-${tcpodNo[2]}`,
            tc: tcpodNo[1] !== 'WS',
            yr: tcpodNo[3] ?? null,
            seq: tcpodNo[4] ?? null
        };
        this.correction = !!tcpodNo[5];
        this.amendment = !!tcpodNo[6];

        // Occasionally, there might be a general remark in the header before the basins
        this.remark = p.extractUntil(/^\s*([A-Z]\. |\d+\. |II+\. |NOTE: |\$\$)/);
    }

    public toJSON(): INous42Header {
        return {
            awips: this.awips,
            issued: this.issued.toJSON(),
            start: this.start.toJSON(),
            end: this.end.toJSON(),
            tcpod: this.tcpod,
            correction: this.correction,
            amendment: this.amendment,
            remark: this.remark
        };
    }
}

export interface INous42Outlook {
    negative: boolean;
    text: string;
}

export interface INous42Canceled {
    tcpod: string | null;
    mission?: string | null;
    tcpodYr?: string | null;
    tcpodSeq?: string | null;
    required?: IWmoDateRange | null;
    canceledAt?: WmoDate;
}

export interface INous42Basin {
    storms: INous42Storm[];
    outlook: INous42Outlook[];
    remarks: string[];
    canceled: INous42Canceled[];
}

export class Nous42Basin implements IWmoObject {

    public readonly storms: Nous42Storm[] = [];
    public readonly outlook: INous42Outlook[] = [];
    public readonly remarks: string[] = [];
    public readonly canceled: INous42Canceled[] = [];

    constructor(p: WmoParser, basinId: string, header: Nous42Header) {
        // Sometimes the Pacific basin appears to be missing completely. In this case, if the next line is the
        // EOT ($$ literal) or a note, just return an empty basin object
        let nextLine = p.peek();
        if (!nextLine || nextLine === '$$' || nextLine.match(/NOTE:/))
            return;

        // Extract the basin name
        p.assert(
            `Expected basin with ID "${basinId}".`,
            new RegExp(`^${basinId}\\.\\s+(.*?) REQUIREMENTS(?:\\s*\\((?:NO\\s*)?CHANGE[DS]\\))?$`));
        //                         II. ANY TEXT REQUIREMENTS(NO CHANGES)
        //                         II. ANY TEXT REQUIREMENTS (CHANGED)

        // Process storms and missions
        this.processStorms(p, header);

        // Process outlook
        this.processOutlook(p);

        // Process potential "ADDITIONAL" outlook
        this.processOutlook(p, true);

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
        } while (nextLine && !nextLine.match(/^\s*\d+\. .*OUTLOOK/));
    }

    processOutlook(p: WmoParser, optional: boolean = false) {
        // Get outlook line
        let outlookLine = p.extract(
            /\d+\. (?:(?:ADDITIONAL|SUCCEEDING)\s+DAY\s+OUTLOOK|OUTLOOK\s+FOR\s+SUCCEEDING\s+DAY)(?::|\.+)(.*)$/);
        if (!outlookLine) {
            // If not optional, throw error
            if (!optional)
                p.error('Expected basin outlook line');
            return;
        }

        // If outlook is negative, simply return with one outlook
        let text = outlookLine[1] ? outlookLine[1].trim() : '';
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

            // Loop until either another outlook line [A-Z] the next ones mentioned above (basin, note, etc.)
            text += p.extractUntil(/^\s*([A-Z]\. |\d+\. |II+\. |NOTE: |\$\$)/);

            // Add to the outlook list
            this.outlook.push({
                negative: false,
                text: text
            });

            nextLine = p.peek();
        } while (nextLine && !nextLine.match(/^\s*(\d+\. |II+\. |NOTE: |\$\$)/));
    }

    processRemark(p: WmoParser, header: Nous42Header) {
        // Get the initial remark text (optional)
        const remark = p.extract(/\d+\.\s+.*?REMARKS?(\s*\(CHANGED\))?:(.*)$/, true, false);
        if (!remark)
            return;

        let text = remark[2] ? remark[2].trim() : '';

        // Loop until we find the next Basin (II+.), NOTE, or literal $$
        let nextLine = p.peek();
        do {
            // Extract the starting line
            let multiStart = p.extract(/^\s*[A-Z]\. (.+)$/);
            if (multiStart && multiStart[1])
                text = multiStart[1];

            // Loop until either another remark line [A-Z] OR one of the ones mentioned above
            text = p.extractUntil(/^\s*([A-Z]\. |\d+\. |II+\. |NOTE: |\$\$)/);

            // Add to the outlook list
            this.remarks.push(text);

            // Process the cancellations
            this.processRemarkCancellations(text, header);

            nextLine = p.peek();
        } while (nextLine && !nextLine.match(/^\s*(II+\. |NOTE: |\$\$)/));
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
            mission: match[1] ?? null,
            tcpod: match[2] ?? null,
            tcpodYr: match[3] ?? null,
            tcpodSeq: match[4] ?? null,
            required: (
                match[5]
                    ? {
                        start: new WmoDate(`${match[5]} ${match[6]}Z`, 'dd HHmmX', tcpodDate),
                        end: match[8]
                            ? new WmoDate(`${match[7] || match[5]} ${match[8]}Z`, 'dd HHmmX', tcpodDate)
                            : null
                    }
                    : null
            ),
            canceledAt: new WmoDate(`${match[9]} ${match[10]}Z`, 'dd HHmmX', tcpodDate)
        });
    }

    public toJSON(): INous42Basin {
        return {
            storms: this.storms.map(s => s.toJSON()),
            outlook: this.outlook,
            remarks: this.remarks,
            canceled: this.canceled
        };
    }
}

export interface INous42Storm {
    name: string | null;
    text: string | null;
    missions: INous42Mission[]
}

export class Nous42Storm implements IWmoObject {

    public readonly name: string | null = null;
    public readonly text: string | null = null;
    public readonly missions: Nous42Mission[] = [];

    constructor(p: WmoParser, header: Nous42Header) {
        // Extract out the storm name
        const rawStormLine = p.extract(/^\s*\d+\.\s+(.+)$/);
        if (!rawStormLine || !rawStormLine[1])
            p.error('Expected a storm name, but it was not found.');

        // Normalize storm name
        const normSearch = rawStormLine[1].match(/^((HURRICANE|TROPICAL STORM|TROPICAL DEPRESSION|POTENTIAL TROPICAL CYCLONE) (.+)|SUSPECT AREA \((.+)\))$/);
        if (normSearch)
            this.name = normSearch[3] || normSearch[4] || rawStormLine[1];
        else
            this.name = rawStormLine[1];

        // Sometimes the mission may be a "non-storm" mission (training), so the storm name actually is a FLIGHT
        // In this case, we need to roll the line back
        if (rawStormLine[1].match(/FLIGHT/))
            p.seek(-1);

        // If the name contains 'MISSION REQUEST' it represents a denied mission request
        if (rawStormLine[1].match(/MISSION REQUEST/))
            this.text = rawStormLine[0];

        // Process storm and mission info
        let nextLine;
        do {
            // If the name matches 'MISSION REQUEST', then it represents a denied mission request
            if (this.text) {
                const text = p.extract();
                if (text)
                    this.text += ' ' + text;

            // Otherwise, process as a mission
            } else {
                // TODO: How to handle the WSPOD missions that have a different format?
                // Temporary bypass
                if (header.tcpod.tc) {
                    this.processMissions(p, header);
                } else {
                    p.extract();
                    p.extractUntil(/^\s*(?:\d+\. |I+\. |NOTES: |\$\$)/);
                }
            }

            nextLine = p.peek();
            } while (nextLine && !nextLine.match(/^\s*(?:\d+\. |I+\. |NOTES: |\$\$)/));
    }

    processMissions(p: WmoParser, header: Nous42Header) {
        // Get Flight Info
        // Group 0 - Full match line
        // Group 1 - Flight Name
        // Group 2 - End or optional flight separation
        const flights = p.extractAll(/FLIGHT[^-]+-\s+(.+?)($|\s{2})/g);
        if (!flights && !p.peek()?.match(/^\s*A\./))
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
        // NOTE: There appears to be some cases where there is 3 date/times. I'm not sure what the third date means
        const requiredDates = p.extractAll(/A\. (\d+)\/(\d+)Z?(,\s*((\d+)\/)?(\d+)Z?)?\S*($|\s{2})/g);
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
        // Group 3 - Optional changed flag
        // Group 4 - Optional second flight separation
        const departures = p.extractAll(/C\. (\d{2})\/(\d{4})Z(\s\(CHANGED\))?($|\s{2})/g);
        if (!departures)
            p.error('Expected a Flight C. Data Line');

        // D. Target Coordinates
        // Group 0 - Full match of line
        // Group 1 - Latitude Number
        // Group 2 - Latitude N or S
        // Group 3 - Longitude Number
        // Group 4 - Longitude E or W
        // Group 5 - Optional second flight separation
        let coordinates = p.extractAll(/D\. (?:(\d+\.\d+)([NS]) (\d+\.\d+)([EW])|(NA))($|\s{2})/g);
        let coordText: string | undefined = undefined;
        if (!coordinates) {
            // Check for a buoy deployment (multi line/coordinates)
            coordText = p.extractUntil(/E\..*$/g);
            if (!coordText)
                p.error('Expected a Flight D. Data Line');

            // Try and match at least one coordinate
            coordinates = p.extractAll(/(\d+\.\d+)([NS]) (\d+\.\d+)([EW])|(NA)/g);
        }

        // E. Fix window
        // Group 0 - Full match of line
        // Group 1 - Window Start Date
        // Group 2 - Window Start Time
        // Group 3 - Window End Date
        // Group 4 - Window End Time
        // Group 5 - Optional second flight separation
        const fixWindows = p.extractAll(/E\. (?:(\d{2})\/(\d{4})Z TO (\d{2})\/(\d{4})Z|(NA))(\s\(CORRECT(?:ED|ION)\))?($|\s{2})/g);
        if (!fixWindows)
            p.error('Expected a Flight E. Data Line');

        // F. Flight altitude(s)
        // Group 0 - Full match of line
        // Group 1 - Altitude in feet (note includes comma)
        // Group 2 - Optional second flight separation
        const altitudes = p.extractAll(/F\. (SFC|[\d,]+) TO ([\d,]+) FT(\s\(CORRECT(?:ED|ION)\))?($|\s{2})/g);
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
        const flightCount = flights ? flights.length : 1;
        for (let i=0; i<flightCount; ++i) {
            this.missions.push(new Nous42Mission(header, {
                flight: flights ? flights[i] : undefined,
                required: requiredDates[i],
                id: missionIdentifiers[i],
                departure: departures[i],
                coordinates: coordinates ? coordinates[i] : undefined,
                fixWindow: fixWindows[i],
                altitude: altitudes[i],
                profile: profiles[i],
                activationStatus: activationStatuses[i],
                remarks: remarks && remarks.length > i ? remarks[i] : undefined
            }));
        }
    }

    public toJSON(): INous42Storm {
        return {
            name: this.name,
            text: this.text,
            missions: this.missions.map(m => m.toJSON())
        };
    }
}

export interface INous42Altitude {
    upper: number | null;
    lower: number | null;
}

export interface INous42Mission {
    tcpod: INous42HeaderTcpod | null;
    name: string | null;
    required: IWmoDateRange | null;
    id: string | null;
    departure: IWmoDate | null;
    coordinates: IWmoCoordinates | null;
    window: IWmoDateRange | null;
    altitude: INous42Altitude | null;
    profile: string | null;
    wra: boolean | null;
    remarks: string | null;
}

export class Nous42Mission implements IWmoObject{

    public readonly tcpod: INous42HeaderTcpod | null = null;
    public readonly name: string | null = null;
    public readonly required: IWmoDateRange | null = null;
    public readonly id: string | null = null;
    public readonly departure: WmoDate | null = null;
    public readonly coordinates: IWmoCoordinates | null = null;
    public readonly window: IWmoDateRange | null = null;
    public readonly altitude: INous42Altitude | null = null;
    public readonly profile: string | null = null;
    public readonly wra: boolean = false;
    public readonly remarks: string | null = null;

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
        this.name = flight && flight[1] ? flight[1] : null;

        if (required) {
            this.required = {
                start: new WmoDate(`${required[1]} ${required[2]}Z`, 'dd HHmmX', tcpodDate),
                end: required[3]
                    ? new WmoDate(`${required[5] || required[1]} ${required[6]}Z`, 'dd HHmmX', tcpodDate)
                    : null
            };
        }

        this.id = id && id[1] ? id[1] : null;

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

        this.profile = profile && profile[1] ? profile[1] : null;
        this.wra = (activationStatus && activationStatus[1] !== 'NO') ?? false;
        this.remarks = remarks && remarks[1] ? remarks[1] : null;
    }

    public toJSON(): INous42Mission {
        return {
            tcpod: this.tcpod,
            name: this.name,
            required: this.required,
            id: this.id,
            departure: this.departure?.toJSON() ?? null,
            coordinates: this.coordinates,
            window: this.window,
            altitude: this.altitude,
            profile: this.profile,
            wra: this.wra,
            remarks: this.remarks
        };
    }
}