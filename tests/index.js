/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
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

import { parseWmo } from '../src/index.js';

const testText = `
152
NOUS42 KNHC 261358
REPRPD
WEATHER RECONNAISSANCE FLIGHTS
CARCAH, NATIONAL HURRICANE CENTER, MIAMI, FL.
1000 AM EDT SAT 26 OCTOBER 2024
SUBJECT: TROPICAL CYCLONE PLAN OF THE DAY (TCPOD)
         VALID 27/1100Z TO 28/1100Z OCTOBER 2024
         TCPOD NUMBER.....25-148

I.  ATLANTIC REQUIREMENTS
    1. NEGATIVE RECONNAISSANCE REQUIREMENTS.
    2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.

II. PACIFIC REQUIREMENTS
    1. NEGATIVE RECONNAISSANCE REQUIREMENTS.
    2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.

$$
KAL

NNNN
`;
const parsed = parseWmo(testText);
console.log('=============================================================');
console.log(parsed);
console.log('=============================================================');
console.log(JSON.stringify(parsed, null, 2));
