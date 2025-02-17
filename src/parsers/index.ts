/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Array of all supported message parsers.
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {WmoMessage} from "../WmoMessage.js";
import {WmoFile} from "../WmoFile.js";

// TODO: Dynamic import of all sub-dir + js files
import {ABXX20} from "./ab/ABXX20.js";
import {NOUS42} from "./no/NOUS42.js";
import {URXX10_11} from "./ur/URXX10_11.js";
import {URXX15} from "./ur/URXX15.js";

export const messageParsers: { [key: string]: new(wmoFile: WmoFile) => WmoMessage } = {
    "ABNT20": ABXX20,
    "ABPZ20": ABXX20,
    "ACPN50": ABXX20,
    "TTAA00": ABXX20,
    "NOUS42": NOUS42,
    "URNT10": URXX10_11,
    "URNT11": URXX10_11,
    "URPA10": URXX10_11,
    "URPA11": URXX10_11,
    "URPN10": URXX10_11,
    "URPN11": URXX10_11,
    "URNT15": URXX15,
    "URPA15": URXX15,
    "URPN15": URXX15
};