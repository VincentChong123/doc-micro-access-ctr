import { getSheetsClient } from '../config/auth.js';

/**
 * Reads data from a specified range in a Google Sheet.
 * @param {string} spreadsheetId 
 * @param {string} range 
 * @returns {Promise<Array<Array<string>>>} 
 */
export async function readRange(spreadsheetId, range) {
    const sheets = await getSheetsClient(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    return response.data.values || [];
}

/**
 * Updates a specified range in a Google Sheet with new values.
 * @param {string} spreadsheetId 
 * @param {string} range 
 * @param {Array<Array<string>>} values 
 * @returns {Promise<Object>} 
 */
export async function updateRange(spreadsheetId, range, values) {
    const sheets = await getSheetsClient(['https://www.googleapis.com/auth/spreadsheets']);
    const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
    return response.data;
}

/**
 * Gets metadata about a Google Sheet (including sheet names).
 * @param {string} spreadsheetId 
 * @returns {Promise<Object>} 
 */
export async function getSpreadsheetInfo(spreadsheetId) {
    const sheets = await getSheetsClient(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const response = await sheets.spreadsheets.get({
        spreadsheetId,
    });
    return response.data;
}
