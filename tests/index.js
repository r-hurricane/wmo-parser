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

const testText = `NOUS42 KNHC 061748
REPRPD
WEATHER RECONNAISSANCE FLIGHTS
CARCAH, NATIONAL HURRICANE CENTER, MIAMI, FL.
1250 PM EST WED 06 NOVEMBER 2024
SUBJECT: TROPICAL CYCLONE PLAN OF THE DAY (TCPOD)
         VALID 07/1100Z TO 08/1100Z NOVEMBER 2024
         TCPOD NUMBER.....24-159

I.  ATLANTIC REQUIREMENTS
    1. HURRICANE RAFAEL
       FLIGHT ONE - TEAL 71          FLIGHT TWO - NOAA 49
       A. 06/1730Z                   A. 07/0000Z
       B. AFXXX 1318A RAFAEL         B. NOAA9 1418A RAFAEL
       C. 06/1500Z                   C. 06/1730Z
       D. 22.2N 82.3W                D. NA
       E. 06/1700Z TO 06/2030Z       E. NA
       F. SFC TO 10,000 FT           F. 41,000 TO 45,000 FT
       G. FIX                        G. SYNOPTIC SURVEILLANCE
       H. NO WRA ACTIVATION          H. NO WRA ACTIVATION

       FLIGHT THREE - NOAA 42        FLIGHT FOUR - TEAL 72
       A. 07/0000Z                   A. 06/2330Z,07/0530Z
       B. NOAA2 1518A RAFAEL         B. AFXXX 1618A RAFAEL
       C. 06/2030Z                   C. 06/2130Z
       D. 23.3N 83.1W                D. 23.2N 83.0W
       E. 06/2100Z TO 07/0300Z       E. 06/2300Z TO 07/0530Z
       F. SFC TO 15,000 FT           F. SFC TO 15,000 FT
       G. TAIL DOPPLER RADAR         G. FIX
       H. WRA ACTIVATION             H. WRA ACTIVATION

       FLIGHT FIVE - NOAA 49         FLIGHT SIX - NOAA 42
       A. 07/1200Z                   A. 07/1200Z
       B. NOAA9 1718A RAFAEL         B. NOAA2 1818A RAFAEL
       C. 07/0530Z                   C. 07/0830Z
       D. NA                         D. 24.4N 84.3W
       E. NA                         E. 07/0900Z TO 07/1500Z
       F. 41,000 TO 45,000 FT        F. SFC TO 15,000 FT
       G. SYNOPTIC SURVEILLANCE      G. TAIL DOPPLER RADAR
       H. NO WRA ACTIVATION          H. WRA ACTIVATION

       FLIGHT SEVEN - TEAL 73
       A. 07/1130Z,1730Z
       B. AFXXX 1918A RAFAEL
       C. 07/0945Z
       D. 24.3N 84.2W
       E. 07/1100Z TO 07/1730Z
       F. SFC TO 15,000 FT
       G. FIX
       H. WRA ACTIVATION

    2. SUSPECT AREA (NORTH OF PUERTO RICO)
       FLIGHT ONE - TEAL 74
       A. 07/1900Z
       B. AFXXX 01JJA INVEST
       C. 07/1400Z
       D. 19.6N 65.3W
       E. 07/1830Z TO 07/2200Z
       F. SFC TO 10,000 FT
       G. LOW-LEVEL INVEST
       H. WRA ACTIVATION

    3. OUTLOOK FOR SUCCEEDING DAY: CONTINUE 12-HRLY FIXES ON RAFAEL
       WHILE SYSTEM REMAINS A THREAT.
	   
    4. REMARK: ALL REMAINING TASKING FOR SUSPECT AREA AL94 IN TCPODS
       24-138 AND 24-139 WAS CANCELED BY NHC AT 18/1330Z.

II. PACIFIC REQUIREMENTS
    1. HURRICANE RAFAEL
       FLIGHT ONE - TEAL 71          FLIGHT TWO - TEAL 72
       A. 07/2330Z                   A. 08/1130Z
       B. AFXXX 2018A RAFAEL         B. AFXXX 2118A RAFAEL
       C. 07/2115Z                   C. 08/1000Z
       D. 24.3N 86.4W                D. 24.4N 88.0W
       E. 07/2300Z TO 08/0230Z       E. 08/1100Z TO 08/1430Z
       F. SFC TO 10,000 FT           F. SFC TO 10,000 FT
       G. FIX                        G. FIX
       H. WRA ACTIVATION             H. WRA ACTIVATION

    2. OUTLOOK FOR SUCCEEDING DAY: 
       A. CONTINUE 6-HRLY FIXES.
       B. TWO ADDITIONAL NOAA 42 P-3 TAIL DOPPLER RADAR MISSIONS INTO
          RAFAEL FOR 08/0000Z AND 08/1200Z, DEPARTING KLAL AT 
          07/2030Z AND 08/0815Z, RESPECTIVELY.  (CORRECTED)
       C. POSSIBLE NOAA G-IV SYNOPTIC SURVEILLANCE MISSION AROUND
          RAFAEL FOR 08/0000Z, DEPARTING KLAL AT 07/1730Z.
       D. POSSIBLE LOW-LEVEL INVEST MISSION NORTH OF THE VIRGIN
          ISLANDS NEAR 19.5N 64.0W FOR 07/1800Z.
    3. REMARKS:
       A. THE NOAA 42 TAIL DOPPLER RADAR AND NOAA 49 SYNOPTIC
          SURVEILLANCE MISSIONS FOR 07/1200Z TASKED IN TCPOD 24-158
          WERE CANCELED BY NHC AT 06/1845Z AND 06/1850Z, RESPECTIVELY.
       B. THE TEAL 74 LOW-LEVEL INVEST MISSION FOR 07/1900Z TASKED IN
          TCPOD 24-159 WAS CANCELED BY NHC AT 07/0900Z.

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
