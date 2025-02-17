/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Represents the message body of a WMO file. Current WMO manual can be found here:
 * https://library.wmo.int/records/item/35800-manual-on-the-global-telecommunication-system
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoObject} from "./WmoInterfaces.js"
import {WmoFile} from "./WmoFile.js";

export abstract class WmoMessage implements IWmoObject {

    protected readonly wmoFile: WmoFile;

    protected constructor(wmoFile: WmoFile) {
        this.wmoFile = wmoFile;
    }

    public abstract toJSON(): object;

}