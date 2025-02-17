/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Parses WMO text files into objects or JSON for easy use. Now, I know what some might think, "Why not use grammars and
 * syntax trees?" Well, these text files sometimes have nuances (like the NOUS42 Tropical Cyclone Plan of the Day) that
 * don't play well with a concrete grammar/tree... Trying to extract data that potentially depends on other parts of the
 * file or even other WMO files seemed too complex for a simple grammar and syntax tree. I may explore that in the
 * future, but for now this works!
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoOptions} from './WmoInterfaces.js';
import {WmoFile} from './WmoFile.js';

// noinspection JSUnusedGlobalSymbols
export const parseWmo = (wmoText: string, options?: IWmoOptions): WmoFile =>
    new WmoFile(wmoText, options);