import os
import google.auth
from googleapiclient.discovery import build
from google.auth.exceptions import DefaultCredentialsError

def main():
    SPREADSHEET_ID = '13Y6RPqTp7-VJ3Px3pVumSFJdmFMNj6a9VPv1bh4QPC4'

    # We will try writing to 'Sheet1!A1:B2'. Change 'Sheet1' to the actual name of your sheet tab.
    RANGE_NAME = 'Sheet1!A1:B2'

    try:
        # Load Application Default Credentials
        # Note: We need full 'spreadsheets' scope for read/write access.
        creds, project = google.auth.default(scopes=[
            'https://www.googleapis.com/auth/spreadsheets'
        ])
    except DefaultCredentialsError:
        print("Error: Could not find Application Default Credentials.")
        print("Please run: gcloud auth application-default login --scopes='https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/cloud-platform'")
        return

    # Build the Google Sheets API client
    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()

    # --- 1. WRITE to the Sheet ---
    print(f"Writing to {RANGE_NAME}...")
    values_to_write = [
        ["Hello", "World"],
        ["From", "Python!"]
    ]
    body = {
        'values': values_to_write
    }

    try:
        result = sheet.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME,
            valueInputOption='RAW',
            body=body
        ).execute()
        print(f"Success! {result.get('updatedCells')} cells updated.")
    except Exception as e:
        print(f"Failed to write to sheet. You must have Editor access to the sheet! Error: {e}")
        return

    # --- 2. READ from the Sheet ---
    print(f"\nReading from {RANGE_NAME}...")
    try:
        result = sheet.values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME
        ).execute()
        values_read = result.get('values', [])

        if not values_read:
            print('No data found.')
        else:
            for row in values_read:
                print(row)
    except Exception as e:
        print(f"Failed to read sheet: {e}")

if __name__ == '__main__':
    main()
