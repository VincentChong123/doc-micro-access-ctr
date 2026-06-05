import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

export async function getSheetsClient(scopes = ['https://www.googleapis.com/auth/spreadsheets']) {
    // GoogleAuth automatically uses GOOGLE_APPLICATION_CREDENTIALS from process.env
    const auth = new GoogleAuth({ scopes });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}
