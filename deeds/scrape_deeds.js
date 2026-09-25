// Paste into the browser console (F12 -> Console) on the search-results page
// that lists the deeds with "View Details" buttons. It opens each deed, reads
// the three tables, closes the popup and moves on. Run it again on each results
// page; rows accumulate. When done, type:  downloadDeeds()
(async () => {
  const DELAY_MS = 1200;          // pause between deeds; raise it if the site is slow
  const TIMEOUT_MS = 15000;       // max wait for a popup to load

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const text = el => (el ? (el.innerText || el.value || el.textContent || '') : '').replace(/\s+/g, ' ').trim();
  const key = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  const DOC = {
    tokennoapplicationno: 'token_no', serialnumber: 'serial_number', dateofregistration: 'registration_date',
    registrationyear: 'registration_year', bookno: 'book_no', documentno: 'document_no', filingyear: 'filing_year',
    chargeablevalue: 'chargeable_value_inr', presentedby: 'presented_by', registrationoffice: 'registration_office',
    transactiontype: 'transaction_type', deedcategory: 'deed_category', procedure: 'procedure',
  };
  const PARTY = {
    sno: 'party_s_no', type: 'party_type', name: 'party_name',
    fatherhusbandsname: 'party_father_husband_name', address: 'party_address',
  };
  const PROP = {
    sno: 'property_s_no', propertytype: 'property_type', registrationoffice: 'property_registration_office',
    circle: 'circle', villagethana: 'village_thana', areatype: 'area_type', ulb: 'ulb', landtype: 'land_type',
    marketvalue: 'market_value_inr', khatano: 'khata_no', plotno: 'plot_no', areadec: 'area_decimal',
    east: 'boundary_east', west: 'boundary_west', north: 'boundary_north', south: 'boundary_south',
  };
  const COLUMNS = [...Object.values(DOC), ...Object.values(PARTY), ...Object.values(PROP)];

  // Reads a table into [{headerKey: value}], using <th> (or the first row) as headers.
  function readTable(table) {
    const rows = [...table.querySelectorAll('tr')];
    const headRow = rows.find(r => r.querySelector('th')) || rows[0];
    if (!headRow) return { headers: [], rows: [] };
    const headers = [...headRow.children].map(c => key(text(c)));
    const data = rows.filter(r => r !== headRow && r.querySelector('td')).map(r => {
      const o = {};
      [...r.children].forEach((c, i) => { if (headers[i]) o[headers[i]] = text(c); });
      return o;
    });
    return { headers, rows: data };
  }

  const mapRow = (src, map) => {
    const o = {};
    for (const [k, v] of Object.entries(src)) o[map[k] || k] = v;
    return o;
  };

  function findPopup() {
    const tables = [...document.querySelectorAll('table')].filter(visible);
    const doc = tables.find(t => readTable(t).headers.includes('tokennoapplicationno'));
    if (!doc) return null;
    // the popup is the closest ancestor that holds all three tables
    let root = doc.parentElement;
    while (root && !root.innerText.match(/Property Details/i)) root = root.parentElement;
    return root || document.body;
  }

  function parsePopup(root) {
    const tables = [...root.querySelectorAll('table')].map(readTable);
    const doc = tables.find(t => t.headers.includes('tokennoapplicationno'));
    const parties = tables.find(t => t.headers.includes('fatherhusbandsname'));
    const props = tables.find(t => t.headers.includes('plotno') || t.headers.includes('khatano'));
    const d = mapRow(doc.rows[0] || {}, DOC);
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d.registration_date || '');
    if (m) d.registration_date = `${m[3]}-${m[2]}-${m[1]}`;   // DD-MM-YYYY -> YYYY-MM-DD
    const ps = parties && parties.rows.length ? parties.rows.map(r => mapRow(r, PARTY)) : [{}];
    const qs = props && props.rows.length ? props.rows.map(r => mapRow(r, PROP)) : [{}];
    const out = [];
    for (const p of ps) for (const q of qs) out.push({ ...d, ...p, ...q });
    return out;
  }

  async function waitFor(fn, what) {
    const end = Date.now() + TIMEOUT_MS;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(200); }
    throw new Error('Timed out waiting for ' + what);
  }

  async function closePopup(root) {
    const btn = [...root.querySelectorAll('button, a, input[type=button]')]
      .find(b => visible(b) && /^\s*[×x✖]?\s*close\s*$/i.test(text(b)))
      || root.querySelector('[data-dismiss="modal"], [data-bs-dismiss="modal"], .close');
    if (btn) btn.click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await waitFor(() => !findPopup(), 'the popup to close');
  }

  const all = (window.__deeds = window.__deeds || []);
  const seen = new Set(all.map(r => JSON.stringify(r)));
  const buttons = [...document.querySelectorAll('button, a, input[type=button], input[type=submit]')]
    .filter(b => visible(b) && /view\s*details?/i.test(text(b)));
  console.log(`Found ${buttons.length} "View Details" buttons on this page.`);

  let prevSig = null;
  for (let i = 0; i < buttons.length; i++) {
    try {
      const t0 = Date.now();
      buttons[i].click();
      const root = await waitFor(() => {
        const r = findPopup();
        if (!r) return null;
        const rows = parsePopup(r);
        const sig = JSON.stringify(rows);
        // wait until new content replaces the previous deed (give up after a few seconds)
        return rows[0].token_no && (sig !== prevSig || Date.now() - t0 > 4000) ? r : null;
      }, 'deed popup');
      const rows = parsePopup(root);
      prevSig = JSON.stringify(rows);
      for (const r of rows) {
        const s = JSON.stringify(r);
        if (!seen.has(s)) { seen.add(s); all.push(r); }
      }
      console.log(`${i + 1}/${buttons.length}: document ${rows[0].document_no}/${rows[0].registration_year} (${all.length} rows total)`);
      await closePopup(root);
    } catch (e) {
      console.warn(`${i + 1}/${buttons.length}: skipped - ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  window.downloadDeeds = () => {
    const extra = [...new Set(all.flatMap(Object.keys))].filter(c => !COLUMNS.includes(c));
    const cols = [...COLUMNS, ...extra];
    const esc = v => (v == null ? '' : /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
    const csv = '﻿' + [cols.join(','), ...all.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'deed_records.csv';
    a.click();
  };
  console.log(`Done. ${all.length} rows collected so far. Go to the next results page and paste again, or run downloadDeeds() to save the CSV.`);
})();
