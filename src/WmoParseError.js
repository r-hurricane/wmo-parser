/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an offical NWS/WMO libary.
 *
 * Specific error type for parse errors.
 *
 * Copyright (c) 2024, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */


export default class WmoParseError extends Error {
	constructor(message, originalError) {
		super(message);
		if (originalError)
			this.stack += `\n====================\n${originalError.stack}\n====================`;
	}
}
