/**
 * HORN HUB — подписчики бота, рассылка, удаление спама и сторож бота.
 *
 * Ставится в Google-таблицу: Расширения → Apps Script → вставить этот файл целиком.
 * Пошаговая инструкция — в README репозитория, раздел «Защита бота».
 *
 * Токен бота НЕ пишите в код: Настройки проекта (шестерёнка) → Свойства скрипта →
 * добавить свойство BOT_TOKEN со значением нового токена из @BotFather.
 */

const SHEET_SUBS = 'Подписчики';
const SUBS_HEADER = ['chat_id', 'username', 'Имя', 'Язык', 'Первый вход', 'Последний вход', 'Статус', 'Последнее сообщение'];
// Впишите в колонку «Статус» — магазин для этого человека закроется, рассылки ему не уходят.
// Снять блокировку — написать «активен».
const BAN_STATUS = 'заблокирован';
// Язык приложения Telegram, для которого магазин закрыт и рассылки не уходят (как BLOCKED_LANGS в js/app.js)
const BLOCKED_LANGS = ['pl'];
const TIME_BUDGET_MS = 5 * 60 * 1000; // Apps Script даёт 6 минут на запуск — останавливаемся заранее
const DELETE_DEPTH = 100;             // сколько последних сообщений в каждом чате пытаться удалить

/* ── Меню в таблице ─────────────────────────────────────── */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('HORN HUB')
    .addItem('🧹 Удалить спам у всех (последние 48 часов)', 'cleanupSpam')
    .addItem('📣 Разослать сообщение всем', 'broadcast')
    .addSeparator()
    .addItem('🛡 Включить сторожа бота (раз в час)', 'installGuard')
    .addItem('ℹ️ Проверить бота', 'checkBot')
    .addToUi();
}

/* ── Telegram ───────────────────────────────────────────── */
function token_() {
  const t = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  if (!t) throw new Error('Не задан BOT_TOKEN: Настройки проекта → Свойства скрипта → BOT_TOKEN');
  return t.trim();
}

function tg_(method, payload) {
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token_() + '/' + method, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true,
  });
  let data;
  try { data = JSON.parse(res.getContentText()); } catch (e) { data = { ok: false, description: res.getContentText() }; }
  // лимит Telegram на частоту — ждём, сколько он просит, и повторяем
  if (!data.ok && data.parameters && data.parameters.retry_after) {
    Utilities.sleep((data.parameters.retry_after + 1) * 1000);
    return tg_(method, payload);
  }
  return data;
}

/* ── Магазин присылает сюда покупателя, который открыл магазин ──
   В ответ магазин узнаёт, не заблокирован ли покупатель: {"access": "ok" | "blocked"}. */
function doPost(e) {
  let access = 'unknown';
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verifyInitData_(body.initData || '', token_());
    if (user && user.id) access = saveSubscriber_(user) ? 'blocked' : 'ok';
  } catch (err) {
    console.warn('doPost: ' + err);
  }
  return ContentService.createTextOutput(JSON.stringify({ access: access }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('HORN HUB: подписчики собираются');
}

// Проверка подписи Telegram: в список попадают только настоящие покупатели из Telegram
function verifyInitData_(initData, botToken) {
  if (!initData || !botToken) return null;
  const params = {};
  initData.split('&').forEach(function (pair) {
    const i = pair.indexOf('=');
    if (i < 0) return;
    params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
  });
  const hash = params.hash;
  if (!hash) return null;
  delete params.hash;
  const check = Object.keys(params).sort().map(function (k) { return k + '=' + params[k]; }).join('\n');
  const secret = Utilities.computeHmacSha256Signature(botToken, 'WebAppData');
  const sign = Utilities.computeHmacSha256Signature(Utilities.newBlob(check).getBytes(), secret);
  const hex = sign.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  if (hex !== hash) return null;
  try { return JSON.parse(params.user || 'null'); } catch (e) { return null; }
}

/* ── Лист «Подписчики» ──────────────────────────────────── */
function subsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_SUBS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SUBS);
    sh.getRange(1, 1, 1, SUBS_HEADER.length).setValues([SUBS_HEADER]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');
  }
  // новая колонка в уже созданном листе
  if (sh.getRange(1, SUBS_HEADER.length).getValue() === '') {
    sh.getRange(1, 1, 1, SUBS_HEADER.length).setValues([SUBS_HEADER]).setFontWeight('bold');
  }
  return sh;
}

function isBanned_(status) {
  return String(status || '').trim().toLowerCase() === BAN_STATUS;
}

function langBlocked_(lang) {
  lang = String(lang || '').toLowerCase();
  return BLOCKED_LANGS.some(function (l) { return lang === l || lang.indexOf(l + '-') === 0; });
}

// Текст из Telegram кладём в таблицу как текст: «=…» не должно стать формулой
function plain_(s) {
  s = String(s || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Что человек написал боту — для колонки «Последнее сообщение»
function messageText_(m) {
  const kinds = ['photo', 'video', 'sticker', 'voice', 'video_note', 'document', 'audio', 'animation', 'contact', 'location'];
  const kind = kinds.filter(function (k) { return m[k]; })[0];
  const text = m.text || m.caption || '[' + (kind || 'сообщение') + ']';
  const time = Utilities.formatDate(new Date(m.date * 1000), Session.getScriptTimeZone(), 'dd.MM HH:mm');
  return time + ' — ' + text.slice(0, 300);
}

// Записывает или обновляет человека в списке. Возвращает true, если он заблокирован в таблице.
function saveSubscriber_(u, lastMessage) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = subsSheet_();
    const now = new Date();
    const username = u.username ? '@' + u.username : '';
    const name = plain_([u.first_name, u.last_name].filter(function (x) { return x; }).join(' '));
    const found = sh.getRange('A:A').createTextFinder(String(u.id)).matchEntireCell(true).findNext();
    if (found) {
      const row = found.getRow();
      const status = sh.getRange(row, 7).getValue();
      const banned = isBanned_(status);
      sh.getRange(row, 2, 1, 3).setValues([[username, name, u.language_code || '']]);
      sh.getRange(row, 6, 1, 2).setValues([[now, banned ? status : 'активен']]); // блокировку не снимаем
      if (lastMessage) sh.getRange(row, 8).setValue(plain_(lastMessage));
      return banned;
    }
    sh.appendRow([String(u.id), username, name, u.language_code || '', now, now, 'активен', plain_(lastMessage)]);
    return false;
  } finally {
    lock.releaseLock();
  }
}

function subscribers_() {
  const sh = subsSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 7).getValues()
    .map(function (r, i) { return { row: i + 2, id: String(r[0]).trim(), lang: String(r[3]), status: String(r[6]) }; })
    .filter(function (s) { return /^\d+$/.test(s.id) && s.status !== 'заблокировал бота'; });
}

// Кому идёт задача: рассылка — без заблокированных и без закрытых языков, удаление спама — всем
function audience_(type) {
  const all = subscribers_();
  if (type !== 'broadcast') return all;
  return all.filter(function (s) { return !isBanned_(s.status) && !langBlocked_(s.lang); });
}

function markStatus_(row, description) {
  const cell = subsSheet_().getRange(row, 7);
  if (isBanned_(cell.getValue())) return; // блокировку, которую поставили вручную, не трогаем
  const d = String(description || '').toLowerCase();
  const status = /blocked|deactivated|chat not found|user not found/.test(d) ? 'заблокировал бота' : 'ошибка: ' + description;
  cell.setValue(plain_(status));
}

/* ── Удаление спама в одном чате ────────────────────────────
   Узнаём номер последнего сообщения в чате (отправляем своё),
   затем удаляем сообщения до него. Telegram даёт удалить только
   сообщения не старше 48 часов — более старые просто пропускаются. */
function cleanChat_(chatId, notice) {
  const sent = tg_('sendMessage', { chat_id: chatId, text: notice || '🧹', disable_notification: true });
  if (!sent.ok) return sent;
  const top = sent.result.message_id;
  const ids = [];
  for (let m = Math.max(1, top - DELETE_DEPTH); m < top; m++) ids.push(m);
  if (!notice) ids.push(top); // без предупреждения удаляем и служебное сообщение
  const res = tg_('deleteMessages', { chat_id: chatId, message_ids: ids });
  if (!res.ok) {
    // запасной путь: по одному, самые свежие
    ids.slice(-30).forEach(function (m) { tg_('deleteMessage', { chat_id: chatId, message_id: m }); });
  }
  return { ok: true };
}

/* ── Длинные задачи по всем подписчикам (с продолжением) ──── */
function runForAll_(job, perChat) {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const subs = audience_(job.type);
  if (!subs.length) { ui.alert('В списке пока нет подписчиков.'); return; }

  const saved = JSON.parse(props.getProperty('job') || 'null');
  let start = 0;
  if (saved && saved.type === job.type && saved.index < subs.length) {
    const again = ui.alert('Продолжить с места остановки (' + saved.index + ' из ' + subs.length + ')?', ui.ButtonSet.YES_NO);
    if (again === ui.Button.YES) { start = saved.index; job = saved; }
  }

  const began = Date.now();
  let done = 0, failed = 0;
  for (let i = start; i < subs.length; i++) {
    if (Date.now() - began > TIME_BUDGET_MS) {
      job.index = i;
      props.setProperty('job', JSON.stringify(job));
      ui.alert('Обработано ' + i + ' из ' + subs.length + '. Время одного запуска закончилось — ' +
        'запустите этот же пункт меню ещё раз, он продолжит с места остановки.');
      return;
    }
    const r = perChat(subs[i], job);
    if (r && r.ok === false) { failed++; markStatus_(subs[i].row, r.description); } else done++;
    Utilities.sleep(40);
  }
  props.deleteProperty('job');
  ui.alert('Готово: ' + done + ' чатов' + (failed ? ', не получилось: ' + failed + ' (см. колонку «Статус»)' : '') + '.');
}

/* ── 🧹 Удалить спам у всех ─────────────────────────────── */
function cleanupSpam() {
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Удалить спам у всех подписчиков?',
    'В каждом чате бота будут удалены сообщения за последние 48 часов (так позволяет Telegram).\n\n' +
    'ВАЖНО: сначала смените токен в @BotFather и вставьте новый в BOT_TOKEN — иначе мошенник продолжит рассылку.',
    ui.ButtonSet.OK_CANCEL);
  if (ok !== ui.Button.OK) return;
  const p = ui.prompt('Сообщение, которое останется в чате после очистки',
    'Например: «Внимание! Недавно от имени нашего бота приходила реклама — это были мошенники, мы её удалили.»\n' +
    'Оставьте пустым, если ничего писать не нужно.', ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  runForAll_({ type: 'cleanup', notice: p.getResponseText().trim() }, function (s, job) {
    return cleanChat_(s.id, job.notice);
  });
}

/* ── 📣 Разослать сообщение всем ────────────────────────── */
function broadcast() {
  const ui = SpreadsheetApp.getUi();
  const p = ui.prompt('Текст рассылки', 'Сообщение получат подписчики из листа «Подписчики», ' +
    'кроме заблокированных и тех, у кого Telegram на польском.', ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  const text = p.getResponseText().trim();
  if (!text) return;
  const n = audience_('broadcast').length;
  if (ui.alert('Отправить сообщение ' + n + ' подписчикам?', text, ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  runForAll_({ type: 'broadcast', text: text }, function (s, job) {
    return tg_('sendMessage', { chat_id: s.id, text: job.text });
  });
}

/* ── ℹ️ Проверить бота ───────────────────────────────────── */
function checkBot() {
  const ui = SpreadsheetApp.getUi();
  const me = tg_('getMe');
  if (!me.ok) { ui.alert('Токен не работает: ' + me.description + '\nПроверьте BOT_TOKEN в свойствах скрипта.'); return; }
  collectFromUpdates_();
  const report = guardReport_();
  ui.alert('Бот @' + me.result.username + ' подключён.\nПодписчиков в списке: ' + subscribers_().length +
    ', получают рассылку: ' + audience_('broadcast').length + '\n\n' +
    (report.length ? '⚠️ ТРЕВОГА:\n' + report.join('\n') : '🛡 Признаков чужого доступа к боту не найдено.'));
}

/* ── 🛡 Сторож бота ─────────────────────────────────────────
   Раз в час проверяет признаки того, что токеном пользуется кто-то ещё,
   и пишет вам на почту. Сам токен поменять может только владелец в @BotFather. */
function installGuard() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'guardBot') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('guardBot').timeBased().everyHours(1).create();
  const me = tg_('getMe');
  if (me.ok) PropertiesService.getScriptProperties().setProperty('botProfile', profile_());
  SpreadsheetApp.getUi().alert('Сторож включён: раз в час проверяет бота и при подозрении пишет на ' +
    Session.getEffectiveUser().getEmail() + '.');
}

function profile_() {
  const name = tg_('getMyName');
  const descr = tg_('getMyDescription');
  const short = tg_('getMyShortDescription');
  return JSON.stringify([
    name.ok ? name.result.name : '',
    descr.ok ? descr.result.description : '',
    short.ok ? short.result.short_description : '',
  ]);
}

function guardReport_() {
  const alerts = [];
  const me = tg_('getMe');
  if (!me.ok) return ['Токен в BOT_TOKEN не работает (' + me.description + '). Если вы его не меняли — проверьте @BotFather.'];

  // 1) кто-то подключил бота к своему серверу (мы вебхук не используем)
  const hook = tg_('getWebhookInfo');
  if (hook.ok && hook.result.url) {
    alerts.push('Бот подключён к чужому серверу: ' + hook.result.url + '. Так перехватывают сообщения и список подписчиков.');
  }
  // 2) изменились имя или описание бота
  const saved = PropertiesService.getScriptProperties().getProperty('botProfile');
  if (saved && saved !== profile_()) alerts.push('Изменились имя или описание бота — если это не вы, токен у посторонних.');
  return alerts;
}

// Забираем новые сообщения боту и дописываем в список всех, кто нажал /start
// (даже если они ещё не открывали магазин). Telegram хранит такие сообщения 24 часа.
function collectFromUpdates_() {
  const props = PropertiesService.getScriptProperties();
  let offset = Number(props.getProperty('updOffset')) || 0;
  let added = 0;
  for (let k = 0; k < 10; k++) {
    const r = tg_('getUpdates', { offset: offset || undefined, limit: 100, timeout: 0, allowed_updates: ['message', 'my_chat_member'] });
    if (!r.ok || !r.result.length) break;
    r.result.forEach(function (u) {
      offset = u.update_id + 1;
      const m = u.message || u.my_chat_member;
      if (!m || !m.chat || m.chat.type !== 'private') return;
      if (u.my_chat_member && u.my_chat_member.new_chat_member.status === 'kicked') {
        const found = subsSheet_().getRange('A:A').createTextFinder(String(m.chat.id)).matchEntireCell(true).findNext();
        if (found) markStatus_(found.getRow(), 'blocked');
        return;
      }
      saveSubscriber_(m.from || m.chat, u.message ? messageText_(u.message) : '');
      added++;
    });
  }
  props.setProperty('updOffset', String(offset));
  return added;
}

function guardBot() {
  collectFromUpdates_();
  const alerts = guardReport_();
  if (!alerts.length) return;
  const props = PropertiesService.getScriptProperties();
  const key = alerts.join('|');
  if (props.getProperty('lastAlert') === key) return; // не спамим одинаковыми письмами
  props.setProperty('lastAlert', key);
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
    '⚠️ HORN HUB: похоже, токен бота у посторонних',
    alerts.join('\n\n') + '\n\nЧто сделать:\n' +
    '1. @BotFather → /mybots → бот → API Token → Revoke current token.\n' +
    '2. Новый токен вставить в таблице: Расширения → Apps Script → Настройки проекта → Свойства скрипта → BOT_TOKEN.\n' +
    '3. Если была рассылка — в таблице меню HORN HUB → «Удалить спам у всех».');
}
