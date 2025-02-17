/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Represents a WMO file. Current WMO manual can be found here:
 * https://library.wmo.int/records/item/35800-manual-on-the-global-telecommunication-system
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

import {IWmoObject, IWmoOptions} from "./WmoInterfaces.js";
import {WmoHeader} from "./WmoHeader.js";
import {WmoMessage} from "./WmoMessage.js";
import {messageParsers} from "./parsers/index.js";
import {WmoParseError} from "./WmoParseError.js";
import {WmoParser} from "./WmoParser.js";

export class WmoFile implements IWmoObject {

    public readonly parser: WmoParser;
    public readonly header?: WmoHeader;
    public readonly message?: WmoMessage;

    constructor(wmoText: string, options?: IWmoOptions) {
        let parser: WmoParser | undefined;
        try {
            // Construct the parser
            parser = this.parser = new WmoParser(wmoText, options);

            // Parse the header
            this.header = new WmoHeader(this.parser);

            // Find the message parser
            const messageParser = options?.messageParser
                ? options.messageParser
                : messageParsers[this.header.designator];
            if (!messageParser) {
                this.parser.error(`No message parser found for designator "${this.header.designator}". Please specify the designator via the 'messageParser' option.`);
            }

            // Now parse the message
            this.message = new messageParser(this);

        } catch(e) {
            if (!(e instanceof WmoParseError) && e instanceof Error && parser) {
                // Move the context pointer back, since the error was encountered before next line was extracted
                parser.seek(-1);
                parser.error(e.message, e);
            }
            throw e;
        }
    }

    toJSON(): object {
        return {
            'header': this.header ?? null,
            'message': this.message ?? null
        }
    }

}