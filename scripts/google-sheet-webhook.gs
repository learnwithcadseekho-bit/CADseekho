/**
 * CADseekho demo leads → Google Sheet.
 *
 * The submit-lead Supabase Edge Function POSTs every saved lead here as JSON.
 * The script checks the shared secret, then adds a row. If the same phone is
 * already in the sheet (a repeat booking), it updates that row instead, so
 * the sheet has one row per person, the same as the database.
 *
 * The database (/admin/leads) is the source of truth. Attended / Paid / Notes
 * changed in the admin aren't pushed back here. Edit them in one place only.
 *
 * ── Deploy (about 5 minutes) ──────────────────────────────────────────────
 *  1. Create a Google Sheet, e.g. "CADseekho leads". Leave it empty; the
 *     header row is added on the first lead.
 *  2. Extensions → Apps Script. Delete the sample code and paste this whole file.
 *  3. Project Settings (gear icon) → Script properties → Add script property:
 *       Property: SHEET_SECRET   Value: a long random string (e.g. 40 characters).
 *     Use the exact same value for the Supabase secret SHEET_SECRET.
 *  4. Deploy → New deployment → gear next to "Select type" → Web app.
 *       Description:   leads webhook
 *       Execute as:    Me
 *       Who has access: Anyone
 *     Click Deploy, authorise with your Google account (Advanced → Go to …
 *     (unsafe) is expected for your own script), and copy the Web app URL
 *     ending in /exec.
 *  5. In the project folder:
 *       npx supabase secrets set GOOGLE_SHEET_WEBHOOK_URL=<the /exec URL> SHEET_SECRET=<same secret>
 *  6. Test: book a demo on the site. A row should appear within a few seconds.
 *
 *  After editing this script you must publish again: Deploy → Manage
 *  deployments → pencil icon → Version: New version → Deploy. The URL stays the same.
 *
 * Why the secret is in the body: Apps Script web apps can't read request
 * headers, so the function sends it in both the X-Sheet-Secret header and the JSON body.
 */

var HEADERS = [
  'Timestamp (IST)', 'Name', 'Phone', 'Email', 'Role', 'Org', 'City', 'CAD',
  'Source', 'UTM campaign', 'UTM content', 'Demo booked', 'Attended', 'Paid', 'Notes', 'Lead ID',
];
var PHONE_COL = 3; // 1-based column of Phone

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('SHEET_SECRET');
    if (!expected || body.secret !== expected) return reply({ ok: false, error: 'unauthorised' });

    var lead = body.lead || {};
    if (!lead.phone) return reply({ ok: false, error: 'no phone' });

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
        // Plain text so Sheets keeps +91… as typed instead of turning it into a number.
        sheet.getRange(1, PHONE_COL, sheet.getMaxRows(), 1).setNumberFormat('@');
      }

      var timestamp = Utilities.formatDate(
        lead.createdAt ? new Date(lead.createdAt) : new Date(), 'Asia/Kolkata', 'dd MMM yyyy, HH:mm'
      );
      var row = [
        timestamp, lead.name, lead.phone, lead.email, lead.role, lead.org, lead.city, lead.cad,
        lead.source, lead.utmCampaign, lead.utmContent,
        lead.demoBooked ? 'Yes' : 'No', lead.attended ? 'Yes' : 'No', lead.paid ? 'Yes' : 'No', lead.notes || '',
        lead.id,
      ];

      var existing = findRowByPhone(sheet, lead.phone);
      if (existing) {
        // Update the details, keep the Attended / Paid / Notes columns as they are.
        sheet.getRange(existing, 1, 1, 12).setValues([row.slice(0, 12)]);
        sheet.getRange(existing, 16).setValue(lead.id);
      } else {
        sheet.appendRow(row);
      }
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function findRowByPhone(sheet, phone) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var phones = sheet.getRange(2, PHONE_COL, last - 1, 1).getValues();
  for (var i = phones.length - 1; i >= 0; i--) {
    if (String(phones[i][0]) === phone) return i + 2;
  }
  return 0;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
