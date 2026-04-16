export const ROLES = {
  student: { label: "O'quvchi", icon: '🎓', color: '#184B45' },
  teacher: { label: "O'qituvchi", icon: '👩‍🏫', color: '#103B36' },
  admin: { label: 'Admin', icon: '⚙️', color: '#215c55' },
  director: { label: 'Direktor', icon: '👔', color: '#0a2a26' },
};

export const SUBJECTS = [
  'IT - Web Dasturlash', 'Ingliz tili', 'Rus tili', 'Koreys tili',
  'Buxgalteriya', 'Matematika', 'Nemis tili', 'Turk tili'
];

export const STAGES = ['Bosqich 1', 'Bosqich 2', 'Bosqich 3', 'Bosqich 4'];
export const ROOMS = ['1-xona', '2-xona', '3-xona', '4-xona', '5-xona', '6-xona', '7-xona'];
export const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
export const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export const SUBJECT_ICONS = {
  'IT - Web Dasturlash': '💻', 'Ingliz tili': '🇬🇧', 'Rus tili': '🇷🇺',
  'Koreys tili': '🇰🇷', 'Buxgalteriya': '📊', 'Matematika': '📐',
  'Nemis tili': '🇩🇪', 'Turk tili': '🇹🇷'
};

export const SUBJECT_COLORS = {
  'IT - Web Dasturlash': '#184B45', 'Ingliz tili': '#1565C0', 'Rus tili': '#B71C1C',
  'Koreys tili': '#880E4F', 'Buxgalteriya': '#E65100', 'Matematika': '#4A148C',
  'Nemis tili': '#1B5E20', 'Turk tili': '#BF360C'
};

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getScoreClass(score) {
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

export function getRankBadge(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function getPaymentBadgeInfo(status) {
  const map = {
    paid: { class: 'badge-success', icon: 'fa-check', text: "To'landi" },
    pending: { class: 'badge-warning', icon: 'fa-clock', text: 'Kutilmoqda' },
    overdue: { class: 'badge-danger', icon: 'fa-exclamation-triangle', text: "Muddati o'tgan" }
  };
  return map[status] || map.pending;
}

export function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now - start) / (7 * 24 * 60 * 60 * 1000));
}

export function getCurrentMonth() {
  return MONTHS[new Date().getMonth()];
}

export function getDayOfWeek(date = new Date()) {
  return DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

export function generateId() {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}
