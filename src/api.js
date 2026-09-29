async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Can’t reach the page server. Check that npm run dev is still running here.');
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      data?.error ??
        `The API didn’t answer (HTTP ${res.status}). Check that TradeTrackerBE is running (npm run dev there).`,
    );
  }
  return data;
}

const query = (params) => new URLSearchParams(params).toString();

export const api = {
  info: () => request('/info'),
  // The backend sorts, filters and works out each closed trade's profit.
  list: (term) => request(`/trades?${query({ term })}`),
  // Realized totals for this week, month, year and overall, on the viewer's calendar.
  summary: (term, today) => request(`/summary?${query({ term, today })}`),
  create: (trade) => request('/trades', { method: 'POST', body: trade }),
  update: (id, changes) => request(`/trades/${id}`, { method: 'PATCH', body: changes }),
  exit: (id, exit) => request(`/trades/${id}/exit`, { method: 'POST', body: exit }),
  remove: (id) => request(`/trades/${id}`, { method: 'DELETE' }),
};
