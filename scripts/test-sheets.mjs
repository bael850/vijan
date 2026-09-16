// Jalankan: node scripts/test-sheets.mjs
// Pastikan sudah: npm install googleapis
// dan file service-account.json ada di root project.

import { google } from "googleapis";
import fs from "fs";

const SPREADSHEET_ID = "1bn1KAxvgvB37_l9k6Odbi32YLf-ztagrokhWEWPR59Y";
const KEY_FILE = "./service-account.json";

async function main() {
  if (!fs.existsSync(KEY_FILE)) {
    console.error("❌ service-account.json tidak ditemukan di root project.");
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Tulisan!A1:I5",
    });

    console.log("✅ Berhasil konek ke Google Sheets!");
    console.log("Data yang terbaca (5 baris pertama, tab Tulisan):");
    console.table(res.data.values);
  } catch (err) {
    console.error("❌ Gagal konek:", err.message);
    if (err.message.includes("PERMISSION_DENIED")) {
      console.error(
        "→ Cek lagi: sudah share sheet ke email service account? (client_email di JSON)",
      );
    }
    if (
      err.message.includes("Unable to parse range") ||
      err.message.includes("not found")
    ) {
      console.error(
        "→ Cek lagi: nama tab beneran 'Tulisan' (huruf besar-kecil harus sama)?",
      );
    }
  }
}

main();
