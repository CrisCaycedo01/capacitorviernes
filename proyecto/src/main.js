const state = {
  current: '0',     // número que se muestra y edita
  previous: null,   // número anterior (para calcular)
  operator: null,   // 'add' | 'subtract' | 'multiply' | 'divide' | null
  overwrite: true,  // si al escribir se reemplaza el current
  lastEq: null,     // para repetir "="
};

const el = {
  display: document.getElementById('display'),
  history: document.getElementById('history'),
  keys: document.querySelector('.keys'),
};

const MAX_LEN = 18;

// Utilidades
const sanitize = (s) => s.replace(/[^\d.-]/g, '');
const isError = (v) => !isFinite(v) || isNaN(v);
const clampLen = (s) => (s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s);

// Actualiza UI
function render() {
  el.display.textContent = state.current;
  const opMap = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
  const hist = (state.previous !== null && state.operator)
    ? `${state.previous} ${opMap[state.operator]}`
    : '';
  el.history.textContent = hist;
}

// Acciones núcleo
function inputDigit(d) {
  if (state.overwrite) {
    state.current = d === '.' ? '0.' : d;
    state.overwrite = false;
  } else {
    if (d === '.' && state.current.includes('.')) return;
    if (state.current === '0' && d !== '.') state.current = d;
    else state.current += d;
  }
  state.current = clampLen(state.current);
  render();
}

function setOperator(op) {
  if (!state.overwrite && state.previous !== null && state.operator) {
    compute();
  } else {
    state.previous = state.current;
  }
  state.operator = op;
  state.overwrite = true;
  render();
}

function percent() {
  const cur = parseFloat(state.current);
  if (isNaN(cur)) return;

  if (state.previous !== null && state.operator && !state.overwrite) {
    // porcentaje relativo al "previous" (estilo calculadoras físicas)
    const base = parseFloat(state.previous);
    state.current = String(base * (cur / 100));
  } else {
    state.current = String(cur / 100);
  }
  state.overwrite = true;
  render();
}

function toggleSign() {
  if (state.current === '0') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : `-${state.current}`;
  render();
}

function clearAll() {
  state.current = '0';
  state.previous = null;
  state.operator = null;
  state.overwrite = true;
  state.lastEq = null;
  render();
}

function delOne() {
  if (state.overwrite) return;
  if (state.current.length <= 1 || (state.current.length === 2 && state.current.startsWith('-'))) {
    state.current = '0';
    state.overwrite = true;
  } else {
    state.current = state.current.slice(0, -1);
  }
  render();
}

function compute() {
  const a = parseFloat(sanitize(state.previous ?? '0'));
  const b = parseFloat(sanitize(state.current ?? '0'));
  let result;

  switch (state.operator) {
    case 'add':       result = a + b; break;
    case 'subtract':  result = a - b; break;
    case 'multiply':  result = a * b; break;
    case 'divide':    result = b === 0 ? Infinity : a / b; break;
    default:          result = b; break;
  }

  if (isError(result)) {
    state.current = 'Error';
    state.previous = null;
    state.operator = null;
    state.overwrite = true;
    return render();
  }

  // redondeo prudente para evitar 0.30000000004
  const rounded = Math.round(result * 1e12) / 1e12;
  state.current = clampLen(String(rounded));
  state.previous = null;
  state.operator = null;
  state.overwrite = true;
  render();
}

function equals() {
  if (state.operator && state.previous !== null) {
    state.lastEq = { prev: state.previous, op: state.operator, cur: state.current };
    compute();
    // Mostrar historia con "="
    const { prev, op } = state.lastEq;
    const opMap = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
    el.history.textContent = `${prev} ${opMap[op]} ${state.lastEq.cur} =`;
  } else if (state.lastEq) {
    // Repetir última operación (convención de muchas calculadoras)
    const { op, cur } = state.lastEq;
    state.previous = state.current;
    state.current = cur;
    state.operator = op;
    compute();
  }
}

// Eventos de UI (click)
el.keys.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn.dataset.digit) return inputDigit(btn.dataset.digit);
  if (btn.dataset.dot)   return inputDigit('.');
  if (btn.dataset.op)    return setOperator(btn.dataset.op);
  if (btn.dataset.equals) return equals();

  if (btn.dataset.action === 'clear')   return clearAll();
  if (btn.dataset.action === 'sign')    return toggleSign();
  if (btn.dataset.action === 'percent') return percent();
  if (btn.dataset.action === 'del')     return delOne();
});

// Atajos de teclado
window.addEventListener('keydown', (e) => {
  const { key } = e;

  if (/\d/.test(key)) { inputDigit(key); return; }
  if (key === '.' || key === ',') { inputDigit('.'); return; }

  if (key === '+' ) return setOperator('add');
  if (key === '-' ) return setOperator('subtract');
  if (key === '*' || key.toLowerCase() === 'x') return setOperator('multiply');
  if (key === '/' ) return setOperator('divide');

  if (key === 'Enter' || key === '=') return equals();
  if (key === 'Escape') return clearAll();
  if (key === 'Backspace') return delOne();
  if (key === '%') return percent();
});

render();