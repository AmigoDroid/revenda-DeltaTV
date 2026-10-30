const I = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.7" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  box: <path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
  ticket: <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 6v12" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3" /></>,
  server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  wallet: <path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01" />,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M14.8 9.3c-.5-.9-1.5-1.3-2.8-1.3-1.7 0-2.8.8-2.8 2 0 3 5.6 1.2 5.6 4.2 0 1.2-1.1 2-2.8 2-1.3 0-2.4-.5-2.9-1.4M12 6.5V8m0 8v1.5" /></>,
  logout: <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  pulse: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
};
export const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>
);

/** Marca: triângulo (delta) + faixa de barras de TV. */
export const Mark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--brand)" /><path d="M16 7l9 17H7z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" /></svg>
);
export const Bars = () => <div className="bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>;
