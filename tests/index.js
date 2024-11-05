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

const testText = `NOUS42 KNHC 022022
REPRPD
WEATHER RECONNAISSANCE FLIGHTS
CARCAH, NATIONAL HURRICANE CENTER, MIAMI, FL.
025 PM EDT SAT 02 NOVEMBER 2024
SUBJECT: TROPICAL CYCLONE PLAN OF THE DAY (TCPOD)
         VALID 03/1100Z TO 04/1100Z NOVEMBER 2024
         TCPOD NUMBER.....24-155 CORRECTION

I.  ATLANTIC REQUIREMENTS
    1. SUSPECT AREA (WESTERN CARIBBEAN - AL97)
       FLIGHT ONE - TEAL 71          FLIGHT TWO - TEAL 72
       A. 03/1800Z                   A. 04/0530Z
       B. AFXXX 01IIA INVEST         B. AFXXX 0218A CYCLONE
       C. 03/1330Z                   C. 04/0530Z
       D. 13.8N 76.3W                D. 15.2N 75.8W
       E. 03/1730Z TO 03/2030Z       E. 04/0500Z TO 05/0830Z
       F. SFC TO 10,000 FT           F. SFC TO 10,000 FT
       G. LOW-LEVEL INVEST  (CORR)   G. FIX
       H. NO WRA ACTIVATION          H. NO WRA ACTIVATION

       FLIGHT THREE - TEAL 73  (CORRECTED)
       A. 04/1130Z
       B. AFXXX 0318A CYCLONE
       C. 04/1130Z
       D. 16.4N 76.1W
       E. 04/1100Z TO 04/1430Z
       F. SFC TO 10,000 FT
       G. FIX
       H. NO WRA ACTIVATION

    2. OUTLOOK FOR SUCCEEDING DAY: CONTINUE 6-HRLY FIXES IF SYSTEM
       DEVELOPS AND REMAINS A THREAT.

II. PACIFIC REQUIREMENTS
    1. NEGATIVE RECONNAISSANCE REQUIREMENTS.
    2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.

NOTE: THE ATLANTIC AND PACIFIC WINTER SEASON REQUIREMENTS ARE NEGATIVE.

$$
SEF

NNNN
`;
const parsed = parseWmo(testText);
console.log('=============================================================');
console.log(parsed);
console.log('=============================================================');
console.log(JSON.stringify(parsed, null, 2));
