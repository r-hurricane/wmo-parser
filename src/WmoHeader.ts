/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Represents a WMO header. Current WMO manual can be found here:
 * https://library.wmo.int/records/item/35800-manual-on-the-global-telecommunication-system
 *
 * Another helpful page on WMO headers can be found here:
 * https://www.weather.gov/tg/head
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoObject} from "./WmoInterfaces.js";
import {IWmoDate, WmoDate} from "./WmoDate.js";
import {WmoParser} from "./WmoParser.js";

export interface IWmoHeaderSegment {
    major: string | null;
    minor: string | null;
    last: boolean;
}

export interface IWmoHeader {
    sequence: number | null;
    designator: string | null;
    station: string | null;
    datetime: IWmoDate | null;
    delay: string | null;
    correction: string | null;
    amendment: string | null;
    segment: IWmoHeaderSegment | null;
}

export class WmoHeader implements IWmoObject {

    public readonly sequence: number | null;
    public readonly designator: string;
    public readonly station: string;
    public readonly datetime: WmoDate;
    public readonly delay: string | null = null;
    public readonly correction: string | null = null;
    public readonly amendment: string | null = null;
    public readonly segment: IWmoHeaderSegment | null = null;

    public constructor(parser: WmoParser) {

        // Extract the sequence number (optional)
        const sequence = parser.extract(/^\s*(\d{3})\s*$/);
        this.sequence = sequence && sequence[1] ? parseInt(sequence[1]) : null;

        // Confirm there is more lines after this
        if (this.sequence && parser.remainingLines() <= 0)
            parser.error('Invalid WMO message: Missing Abbreviated Heading. First line was detected as the "starting line" which is optional. Second line should then be the Abbreviated Heading as defined at https://www.weather.gov/tg/head');

        // Match the abbreviated heading line
        const abbvHeading = parser.extract(/^(\w\w\w\w\d\d)\s+(\w\w\w\w)\s+(\d\d)(\d\d)(\d\d)(?:\s+(?:(RR|CC|AA)([A-X])|P([A-Z])([A-Z])))?$/);
        if (!abbvHeading)
            parser.error('Invalid WMO message: Missing Abbreviated Heading. First line should be the Abbreviated Heading as defined at https://www.weather.gov/tg/head');

        this.designator = abbvHeading[1] ? abbvHeading[1].toUpperCase() : parser.error('Failed to parse WMO Designator from heading.');
        this.station = abbvHeading[2] ? abbvHeading[2].toUpperCase() : parser.error('Failed to parse WMO Station from heading.');
        this.datetime = new WmoDate(`${abbvHeading[3]} ${abbvHeading[4]}:${abbvHeading[5]}Z`, 'dd HH:mmX', parser.getDateContext());

        // Process Delays, Corrections, Amendments, and Segments
        if (abbvHeading[6]) {
            this[abbvHeading[6] === 'RR' ? 'delay' : abbvHeading[6] === 'CC' ? 'correction' : 'amendment'] = abbvHeading[7] ?? null;
        } else if (abbvHeading[8]) {
            this.segment = {
                major: abbvHeading[8] ?? null,
                minor: abbvHeading[9] ?? null,
                last: abbvHeading[8] == 'Z'
            };
        }
    }

    toJSON(): IWmoHeader {
        return {
            sequence: this.sequence ?? null,
            designator: this.designator ?? null,
            station: this.station ?? null,
            datetime: this.datetime.toJSON() ?? null,
            delay: this.delay ?? null,
            correction: this.correction ?? null,
            amendment: this.amendment ?? null,
            segment: this.segment ?? null
        };
    }

}