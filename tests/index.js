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
000
NOUS42 KNHC 201807
REPRPD
WEATHER RECONNAISSANCE FLIGHTS
CARCAH, NATIONAL HURRICANE CENTER, MIAMI, FL.
0210 PM EDT SUN 20 OCTOBER 2024
SUBJECT: TROPICAL CYCLONE PLAN OF THE DAY (TCPOD)
         VALID 21/1100Z TO 22/1100Z OCTOBER 2024
         TCPOD NUMBER.....24-142

I.  ATLANTIC REQUIREMENTS

    1. HURRICANE NADINE
       FLIGHT ONE - TEAL 76          FLIGHT TWO - TEAL 74
       A. 21/2330Z,22/0530Z          A. 22/1130Z,1730Z
       B. AFXXX 0516A OSCAR          B. AFXXX 0616A OSCAR
       C. 21/2100Z                   C. 22/0900Z
       D. 21.5N 76.0W                D. 22.1N 75.7W
       E. 21/2300Z TO 22/0530Z       E. 22/1100Z TO 22/1730Z
       F. SFC TO 10,000 FT           F. SFC TO 10,000 FT
       G. FIX                        G. FIX
       H. NO WRA ACTIVATION          H. WRA ACTIVATION
       I. RESOURCES PERMITTING
	   
       FLIGHT ONE - TEAL 76          FLIGHT TWO - TEAL 74
       A. 21/2330Z,22/0530Z          A. 22/1130Z,1730Z
       B. AFXXX 0516A OSCAR          B. AFXXX 0616A OSCAR
       C. 21/2100Z                   C. 22/0900Z
       D. 21.5N 76.0W                D. 22.1N 75.7W
       E. 21/2300Z TO 22/0530Z       E. 22/1100Z TO 22/1730Z
       F. SFC TO 10,000 FT           F. SFC TO 10,000 FT
       G. FIX                        G. FIX
       H. NO WRA ACTIVATION          H. WRA ACTIVATION
       I. RESOURCES PERMITTING
	   
    2. HURRICANE OSCAR
	
       FLIGHT ONE - TEAL 76          FLIGHT TWO - TEAL 74
       A. 21/2330Z,22/0530Z          A. 22/1130Z,1730Z
       B. AFXXX 0516A OSCAR          B. AFXXX 0616A OSCAR
       C. 21/2100Z                   C. 22/0900Z
       D. 21.5N 76.0W                D. 22.1N 75.7W
       E. 21/2300Z TO 22/0530Z       E. 22/1100Z TO 22/1730Z
       F. SFC TO 10,000 FT           F. SFC TO 10,000 FT
       G. FIX                        G. FIX
       H. NO WRA ACTIVATION          H. WRA ACTIVATION
       I. RESOURCES PERMITTING

    3. OUTLOOK FOR SUCCEEDING DAY: CONTINUE 6-HRLY FIXES IF SYSTEM
       REMAINS A THREAT.
	   
	   CONTINUE 6-HRLY FIXES IF SYSTEM REMAINS A THREAT.
	   
	   READDRESS THE SYSTEMS IF NECESSARY. THIS IS ADDITIONAL
	   TEXT ON OTHER LINES FOR THE OUTLOOOK.
	   
    4. REMARK: THE TEAL 74 MISSION INTO OSCAR TASKED IN TCPOD 24-141
       WAS CANCELED BY NHC AT 20/1735Z.
	   
	   MISSIONS MAY BE RESCHEDULED IF NECESSARY.

II. PACIFIC REQUIREMENTS
    1. NEGATIVE RECONNAISSANCE REQUIREMENTS.
    2. OUTLOOK FOR SUCCEEDING DAY.....NEGATIVE.

$$
SEF

NNNN
`;
const parsed = parseWmo(testText);
console.log('=============================================================');
console.log(parsed);
console.log('=============================================================');
console.log(JSON.stringify(parsed, null, 2));
