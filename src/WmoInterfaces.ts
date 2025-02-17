/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Defines various interfaces used across the library.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {WmoFile} from "./WmoFile.js";
import {WmoMessage} from "./WmoMessage.js";

export interface IWmoOptions {
    messageParser?: new(wmoFile: WmoFile) => WmoMessage;
    dateCtx?: Date;
}

export interface IWmoCoordinates {
    lat: number;
    lon: number;
}

export interface IWmoObject {
    toJSON(): object;
}