/*!
 * WMO Parser <https://github.com/r-hurricane/wmo-parser>
 *
 * NOTE: This is not an official NWS/WMO library.
 *
 * Specific error type for parse errors.
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

export class WmoParseError extends Error {
    constructor(message: string, originalError?: Error) {
        super(message, originalError ? { cause: originalError } : undefined);
    }
}