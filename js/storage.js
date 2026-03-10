/* PERSISTÊNCIA — localStorage */
function load() {
  try {
    const f = localStorage.getItem('ah_files_v4');   if (f) S.files = JSON.parse(f);
    const p = localStorage.getItem('ah_prices_v4');  if (p) S.prices = JSON.parse(p);
    const r = localStorage.getItem('ah_range_v4');   if (r) { const v = JSON.parse(r); S.dateFrom = v.f; S.dateTo = v.t; }
    const h = localStorage.getItem('ah_hidden_v4');  if (h) S.hiddenPatients = JSON.parse(h);
  } catch (e) {}
}

const saveF = () => { try { localStorage.setItem('ah_files_v4',  JSON.stringify(S.files));          } catch (e) {} };
const saveP = () => { try { localStorage.setItem('ah_prices_v4', JSON.stringify(S.prices));         } catch (e) {} };
const saveR = () => { try { localStorage.setItem('ah_range_v4',  JSON.stringify({ f: S.dateFrom, t: S.dateTo })); } catch (e) {} };
const saveH = () => { try { localStorage.setItem('ah_hidden_v4', JSON.stringify(S.hiddenPatients)); } catch (e) {} };
