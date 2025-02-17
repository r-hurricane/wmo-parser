/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Array of all supported message parsers.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {WmoMessage} from "../WmoMessage.js";
import {WmoFile} from "../WmoFile.js";

// TODO: Dynamic import of all sub-dir + js files
import {NOUS42} from "./no/NOUS42.js";
import {URNT10_11} from "./ur/URNT10_11.js";
import {URNT15} from "./ur/URNT15.js";

export const messageParsers: { [key: string]: new(wmoFile: WmoFile) => WmoMessage } = {
    "NOUS42": NOUS42,
    "URNT10": URNT10_11,
    "URNT11": URNT10_11,
    "URNT15": URNT15
};