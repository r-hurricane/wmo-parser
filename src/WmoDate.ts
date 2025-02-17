/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * This class simply represents a Date, but allows consistent and controllable date formatting when stringify is called.
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import * as dateFns from 'date-fns';
import {IWmoObject} from "./WmoInterfaces.js";

export interface IWmoDateRange {
    start: WmoDate | null,
    end: WmoDate | null
}

export class WmoDate implements IWmoObject {

    public readonly date: Date;

    constructor(dateStr: string, format: string, dateCtx?: Date | WmoDate | null) {
        // TODO: Find something better here, but there doesnt appear to be a good solution for some reason...
        dateStr = dateStr.replace('EDT', '-04:00')
            .replace('EST', '-05:00')
            .replace('CDT', '-05:00')
            .replace('CST', '-06:00')
            .replace('MDT', '-06:00')
            .replace('MST', '-07:00')
            .replace('PDT', '-07:00')
            .replace('PST', '-08:00')
            .replace('HDT', '-09:00')
            .replace('HST', '-10:00');

        // Normalize date context, or set to now if undefined
        dateCtx = (dateCtx && (dateCtx instanceof WmoDate ? dateCtx.date : dateCtx)) || new Date();

        // Parse date
        this.date = dateFns.parse(dateStr, format, dateCtx);
        if (!this.date || !dateFns.isValid(this.date))
            throw new Error(`Failed to parse date "${dateStr}" to format "${format}" with context "${dateCtx}": ${this.date}`);
    }

    toJSON() {
        return {
            'iso': this.date.toISOString(),
            'time': this.date.getTime()
        }
    }

}