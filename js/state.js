/* ESTADO GLOBAL */
let S = {
  files: [],
  prices: { default: 200, patients: {} },
  dateFrom: null,
  dateTo: null,
  tab: 'dashboard',
  search: '',
  hiddenPatients: [],
  patSort: { col: 'revenue', dir: 'desc' }
};

let chart = null;
