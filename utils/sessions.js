const crypto = require('crypto');

// Сессии в памяти: случайный токен в cookie → данные пользователя.
// В cookie нет ни псевдонима, ни id — подделать вход, изменив cookie, нельзя.
const SESSION_COOKIE = 'sid';
const { security } = require('../config/limits');

const TTL_MS = security.sessionTtlDays * 24 * 60 * 60 * 1000; // срок жизни сессии
const MAX_SESSIONS = security.maxSessions;                     // защита памяти от массового создания сессий
const TOKEN_RE = /^[a-f0-9]{64}$/;

const sessions = new Map();

function create(user) {
  // Самые старые сессии удаляются, если достигнут лимит
  while (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, nickname: user.nickname, expiresAt: Date.now() + TTL_MS, flash: null });
  return token;
}

function get(token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function destroy(token) {
  if (typeof token === 'string') sessions.delete(token);
}

// Удаление сессий пользователя (например, если учётная запись пропала из файла)
function destroyByUser(userId) {
  sessions.forEach((s, token) => { if (s.userId === userId) sessions.delete(token); });
}

module.exports = { create, get, destroy, destroyByUser, SESSION_COOKIE, TTL_MS };
