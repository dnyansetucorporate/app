type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l(count);
}

export function showLoading() {
  count += 1;
  notify();
}

export function hideLoading() {
  count = Math.max(0, count - 1);
  notify();
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  fn(count);
  return () => { listeners.delete(fn); };
}

export function isLoading() {
  return count > 0;
}

export default { showLoading, hideLoading, subscribe, isLoading };
