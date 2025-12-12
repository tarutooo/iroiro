// タブ切替
function switchTab(ev) {
  const targetId = ev.currentTarget.getAttribute('data-target');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(targetId).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  ev.currentTarget.classList.add('active');
}

// タイマー管理
let activeTimers = [];
let timerId = 0;

function setNotification() {
  const name = document.getElementById('notificationName').value.trim();
  const secondsInput = document.getElementById('seconds').value;
  const timeInput = document.getElementById('time').value;
  if (!name) { alert('通知名を入力してください'); return; }
  let targetTime = null; let delayMs = null;
  if (timeInput) {
    const now = new Date();
    const [hh, mm] = timeInput.split(':').map(n => parseInt(n, 10));
    targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if (targetTime.getTime() <= now.getTime()) targetTime.setDate(targetTime.getDate() + 1);
    delayMs = targetTime.getTime() - now.getTime();
    if (delayMs > 259200 * 1000) return alert('時刻指定は最大3日以内にしてください');
  } else {
    const value = parseFloat(secondsInput);
    const unit = document.getElementById('unit').value;
    if (!value || value <= 0) return alert('正しい時間を入力してください（1以上）');
    if (unit === 'seconds') delayMs = value * 1000;
    else if (unit === 'minutes') delayMs = value * 60 * 1000;
    else if (unit === 'hours') delayMs = value * 60 * 60 * 1000;
    else return alert('不明な単位です');
    if (delayMs < 5000) return alert('最小は5秒です');
    if (delayMs > 259200 * 1000) return alert('最大は3日です');
    targetTime = new Date(Date.now() + delayMs);
  }
  const timer = { id: timerId++, name, targetTime, startTime: Date.now(), timeoutId: null };
  timer.timeoutId = setTimeout(() => {
    const timeText = formatTimeDifference(timer.targetTime, new Date());
    createNotification('通知タイマー', timer.name, `${timeText}が経過しました`);
    removeTimer(timer.id);
  }, delayMs);
  activeTimers.push(timer);
  updateTimerDisplay();
  document.getElementById('notificationName').value = '';
  document.getElementById('seconds').value = '';
  document.getElementById('time').value = '';
}

function createNotification(appName, title, message) {
  showBrowserNotification(appName, title, message);
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = 'notification info';
  notification.id = `notification-${Date.now()}`;
  const now = new Date();
  const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  notification.innerHTML = `
    <button class="notification-close" onclick="removeNotification('${notification.id}')">&times;</button>
    <div class="notification-header">
      <div class="notification-icon"></div>
      <div class="notification-app">${appName}</div>
      <div class="notification-time">${timeString}</div>
    </div>
    <div class="notification-title">${title}</div>
    <div class="notification-message">${message}</div>
  `;
  container.appendChild(notification);
  setTimeout(() => removeNotification(notification.id), 5000);
}

function showBrowserNotification(appName, title, message) {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, { body: message, icon: getNotificationIcon(), tag: `timer-${Date.now()}`, requireInteraction: false, silent: true });
      notification.onclick = function() { window.focus(); this.close(); };
      setTimeout(() => notification.close(), 5000);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => { if (permission === 'granted') showBrowserNotification(appName, title, message); });
    }
  }
}

function getNotificationIcon() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#007AFF'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(32, 32, 20, 0, 2 * Math.PI); ctx.fill();
  return canvas.toDataURL();
}

function removeNotification(id) {
  const notification = document.getElementById(id);
  if (notification) { notification.classList.add('removing'); setTimeout(() => notification.remove(), 300); }
}

function removeTimer(id) {
  const index = activeTimers.findIndex(timer => timer.id === id);
  if (index !== -1) { clearTimeout(activeTimers[index].timeoutId); activeTimers.splice(index, 1); updateTimerDisplay(); saveTimersToStorage(); }
}

function cancelAllTimers() { activeTimers.forEach(timer => clearTimeout(timer.timeoutId)); activeTimers = []; updateTimerDisplay(); }

function formatTimeDifference(target, from) {
  const remainingMs = target.getTime() - from.getTime(); if (remainingMs <= 0) return '0秒';
  const totalSeconds = Math.floor(remainingMs / 1000);
  if (totalSeconds >= 60) { const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${minutes}分${seconds}秒`; }
  return `${totalSeconds}秒`;
}

function updateTimerDisplay() {
  const container = document.getElementById('activeTimers');
  if (activeTimers.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = '<h3>アクティブなタイマー</h3>';
  activeTimers.forEach(timer => {
    const timerElement = document.createElement('div'); timerElement.className = 'timer-item';
    const scheduled = new Date(timer.targetTime);
    const scheduledText = `${scheduled.getHours().toString().padStart(2,'0')}:${scheduled.getMinutes().toString().padStart(2,'0')}`;
    timerElement.innerHTML = `
      <div class="timer-info">
        <div class="timer-name">${timer.name}</div>
        <div class="timer-countdown" id="countdown-${timer.id}">
          ${scheduledText} に通知（残り計算中...）
        </div>
      </div>
      <button class="cancel-btn" onclick="removeTimer(${timer.id})">キャンセル</button>
    `;
    container.appendChild(timerElement);
  });
  saveTimersToStorage();
}

function updateCountdowns() {
  const now = new Date();
  activeTimers.forEach(timer => {
    const element = document.getElementById(`countdown-${timer.id}`);
    if (element) {
      const target = new Date(timer.targetTime);
      const remainingMs = target.getTime() - now.getTime();
      if (remainingMs > 0) {
        const totalSeconds = Math.floor(remainingMs / 1000);
        if (totalSeconds >= 60) { const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; element.textContent = `残り ${minutes}分${seconds}秒`; }
        else { element.textContent = `残り ${totalSeconds}秒`; }
      } else { element.textContent = `残り 0秒`; }
    }
  });
}
setInterval(updateCountdowns, 1000);

function saveTimersToStorage() {
  try { const data = activeTimers.map(t => ({ id: t.id, name: t.name, targetTime: t.targetTime, startTime: t.startTime })); localStorage.setItem('notificationTimers', JSON.stringify(data)); } catch (e) { console.error('保存に失敗しました', e); }
}
function readTimersFromStorage() { try { const raw = localStorage.getItem('notificationTimers'); if (!raw) return []; return JSON.parse(raw); } catch (e) { console.error('読み込みに失敗しました', e); return []; } }
function clearStoredTimers() { localStorage.removeItem('notificationTimers'); alert('保存データを削除しました'); }
function exportTimers() { const data = readTimersFromStorage(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'timers.json'; a.click(); URL.revokeObjectURL(url); }
function importTimersPrompt() { const json = prompt('保存データのJSONを貼り付けてください'); if (!json) return; try { const parsed = JSON.parse(json); importTimers(parsed); } catch (e) { alert('JSONの解析に失敗しました'); } }
function importTimers(parsed) {
  if (!Array.isArray(parsed)) return alert('不正なデータです'); cancelAllTimers();
  parsed.forEach(item => {
    const target = new Date(item.targetTime);
    const now = Date.now();
    const delay = target.getTime() - now; if (delay <= 0) return; if (delay < 5000) return; if (delay > 259200 * 1000) return;
    const timer = { id: timerId++, name: item.name || '通知', targetTime: target, startTime: item.startTime || Date.now(), timeoutId: null };
    timer.timeoutId = setTimeout(() => { createNotification('通知タイマー', timer.name, '指定時刻になりました'); removeTimer(timer.id); }, delay);
    activeTimers.push(timer);
  });
  updateTimerDisplay(); saveTimersToStorage();
}

window.addEventListener('load', () => {
  const saved = readTimersFromStorage(); if (saved && saved.length) importTimers(saved);
  renderNotes();
  try { const guided = localStorage.getItem('mytools_guided'); if (!guided) { localStorage.setItem('mytools_guided', '1'); createNotification('マイツールズ', 'ようこそ', '上のタブから機能を選べます'); } } catch {}
  loadStopwatchState();
  loadCalcState();
});
window.addEventListener('load', () => { requestNotificationPermission(); });

function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => { if (permission === 'granted') { console.log('通知の許可が得られました'); } else { console.log('通知の許可が拒否されました'); } });
    } else if (Notification.permission === 'denied') { alert('通知がブロックされています。ブラウザの設定で通知を許可してください。'); }
  } else { alert('このブラウザは通知をサポートしていません。'); }
}

// ========= メモ =========
let notes = [];
function readNotesFromStorage() { try { const raw = localStorage.getItem('memoNotes'); return raw ? JSON.parse(raw) : []; } catch (e) { console.error('メモ読み込みに失敗', e); return []; } }
function saveNotesToStorage() { try { localStorage.setItem('memoNotes', JSON.stringify(notes)); } catch (e) { console.error('メモ保存に失敗', e); } }
function renderNotes() {
  notes = readNotesFromStorage(); const list = document.getElementById('notesList');
  if (!notes.length) { list.innerHTML = '<p style="color:#666;">まだメモがありません。</p>'; return; }
  list.innerHTML = '';
  notes.forEach(n => {
    const wrap = document.createElement('div'); wrap.style.border = '1px solid #e9ecef'; wrap.style.borderRadius = '6px'; wrap.style.padding = '12px'; wrap.style.marginBottom = '10px';
    const title = document.createElement('div'); title.style.fontWeight = '600'; title.style.marginBottom = '6px'; title.textContent = n.title || '無題';
    const content = document.createElement('div'); content.style.whiteSpace = 'pre-wrap'; content.style.color = '#444'; content.textContent = n.content || '';
    const meta = document.createElement('div'); meta.style.fontSize = '12px'; meta.style.color = '#777'; meta.style.marginTop = '6px'; meta.textContent = `更新: ${new Date(n.updatedAt).toLocaleString('ja-JP')}`;
    const actions = document.createElement('div'); actions.style.marginTop = '8px';
    const editBtn = document.createElement('button'); editBtn.textContent = '編集'; editBtn.onclick = () => { document.getElementById('noteTitle').value = n.title || ''; document.getElementById('noteContent').value = n.content || ''; document.getElementById('noteTitle').dataset.editId = n.id; };
    const deleteBtn = document.createElement('button'); deleteBtn.textContent = '削除'; deleteBtn.style.background = '#dc3545'; deleteBtn.onclick = () => deleteNote(n.id);
    actions.appendChild(editBtn); actions.appendChild(deleteBtn);
    wrap.appendChild(title); wrap.appendChild(content); wrap.appendChild(meta); wrap.appendChild(actions);
    list.appendChild(wrap);
  });
}
function saveNote() {
  const titleEl = document.getElementById('noteTitle'); const contentEl = document.getElementById('noteContent');
  const title = titleEl.value.trim(); const content = contentEl.value.trim(); if (!title && !content) return alert('タイトルか内容を入力してください');
  const editId = titleEl.dataset.editId;
  if (editId) { const idx = notes.findIndex(n => String(n.id) === String(editId)); if (idx !== -1) { notes[idx].title = title; notes[idx].content = content; notes[idx].updatedAt = Date.now(); } delete titleEl.dataset.editId; }
  else { const note = { id: Date.now(), title, content, updatedAt: Date.now() }; notes.unshift(note); }
  saveNotesToStorage(); renderNotes(); clearNoteInputs();
}
function deleteNote(id) { notes = notes.filter(n => n.id !== id); saveNotesToStorage(); renderNotes(); }
function clearNoteInputs() { const titleEl = document.getElementById('noteTitle'); const contentEl = document.getElementById('noteContent'); titleEl.value = ''; contentEl.value = ''; delete titleEl.dataset.editId; }
function exportNotes() { const data = readNotesFromStorage(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'notes.json'; a.click(); URL.revokeObjectURL(url); }
function importNotesPrompt() { const json = prompt('メモのJSONを貼り付けてください'); if (!json) return; try { const parsed = JSON.parse(json); importNotes(parsed); } catch (e) { alert('JSONの解析に失敗しました'); } }
function importNotes(parsed) { if (!Array.isArray(parsed)) return alert('不正なデータです'); notes = parsed.map(n => ({ id: n.id || Date.now(), title: n.title || '', content: n.content || '', updatedAt: n.updatedAt || Date.now() })); saveNotesToStorage(); renderNotes(); }

// ========= ストップウォッチ =========
let swStartTime = 0; let swElapsed = 0; let swTimerId = null; let swRunning = false; let swLaps = [];
function formatStopwatch(ms) { const totalMs = Math.max(0, ms); const totalSec = Math.floor(totalMs / 1000); const minutes = Math.floor(totalSec / 60); const seconds = totalSec % 60; const hundredths = Math.floor((totalMs % 1000) / 10); return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(hundredths).padStart(2,'0')}`; }
function updateStopwatchDisplay() { const display = document.getElementById('stopwatchDisplay'); const now = Date.now(); const elapsed = swRunning ? (swElapsed + (now - swStartTime)) : swElapsed; display.textContent = formatStopwatch(elapsed); }
function setStopwatchButtons({start, pause, reset, lap}) { document.getElementById('swStartBtn').disabled = !start; document.getElementById('swPauseBtn').disabled = !pause; document.getElementById('swResetBtn').disabled = !reset; document.getElementById('swLapBtn').disabled = !lap; }
function startStopwatch() { if (swRunning) return; swRunning = true; swStartTime = Date.now(); swTimerId = setInterval(updateStopwatchDisplay, 50); setStopwatchButtons({start:false, pause:true, reset:true, lap:true}); saveStopwatchState(); }
function pauseStopwatch() { if (!swRunning) return; swRunning = false; swElapsed += Date.now() - swStartTime; clearInterval(swTimerId); swTimerId = null; updateStopwatchDisplay(); setStopwatchButtons({start:true, pause:false, reset:true, lap:false}); saveStopwatchState(); }
function resetStopwatch() { swRunning = false; swElapsed = 0; swStartTime = 0; clearInterval(swTimerId); swTimerId = null; updateStopwatchDisplay(); swLaps = []; renderLaps(); setStopwatchButtons({start:true, pause:false, reset:false, lap:false}); saveStopwatchState(); }
function lapStopwatch() { const nowElapsed = swRunning ? (swElapsed + (Date.now() - swStartTime)) : swElapsed; const lastLapTotal = swLaps.length ? swLaps[swLaps.length - 1].totalMs : 0; const lapMs = nowElapsed - lastLapTotal; const lap = { id: Date.now(), index: swLaps.length + 1, lapMs, totalMs: nowElapsed }; swLaps.push(lap); renderLaps(); saveStopwatchState(); }
function renderLaps() { const list = document.getElementById('lapList'); if (!swLaps.length) { list.innerHTML = '<p style="color:#666;">ラップはまだありません。</p>'; return; } list.innerHTML = ''; swLaps.forEach(l => { const row = document.createElement('div'); row.className = 'timer-item'; row.innerHTML = `
  <div class="timer-info">
    <div class="timer-name">Lap ${l.index}</div>
    <div class="timer-countdown">ラップ: ${formatStopwatch(l.lapMs)} / 合計: ${formatStopwatch(l.totalMs)}</div>
  </div>
  <button class="cancel-btn" onclick="deleteLap(${l.id})">削除</button>
`; list.appendChild(row); }); }
function deleteLap(id) { swLaps = swLaps.filter(l => l.id !== id); renderLaps(); saveStopwatchState(); }
function clearLaps() { swLaps = []; renderLaps(); saveStopwatchState(); }
function saveStopwatchState() { try { const data = { swElapsed, swRunning, swStartTime: swRunning ? swStartTime : 0, swLaps }; localStorage.setItem('mytools_stopwatch', JSON.stringify(data)); } catch (e) {} }
function loadStopwatchState() { try { const raw = localStorage.getItem('mytools_stopwatch'); if (!raw) { setStopwatchButtons({start:true, pause:false, reset:false, lap:false}); return; } const data = JSON.parse(raw); swElapsed = data.swElapsed || 0; swRunning = !!data.swRunning; swStartTime = data.swStartTime || 0; swLaps = Array.isArray(data.swLaps) ? data.swLaps : []; renderLaps(); updateStopwatchDisplay(); if (swRunning) { swTimerId = setInterval(updateStopwatchDisplay, 50); setStopwatchButtons({start:false, pause:true, reset:true, lap:true}); } else { setStopwatchButtons({start:true, pause:false, reset:swElapsed>0, lap:false}); } } catch (e) { setStopwatchButtons({start:true, pause:false, reset:false, lap:false}); } }

// Export/Import Laps
function exportLaps() { const blob = new Blob([JSON.stringify(swLaps, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'laps.json'; a.click(); URL.revokeObjectURL(url); }
function importLapsPrompt() { const json = prompt('ラップのJSONを貼り付けてください'); if (!json) return; try { const parsed = JSON.parse(json); importLaps(parsed); } catch (e) { alert('JSONの解析に失敗しました'); } }
function importLaps(parsed) { if (!Array.isArray(parsed)) return alert('不正なデータです'); swLaps = parsed.map(l => ({ id: l.id || Date.now(), index: l.index || 0, lapMs: l.lapMs || 0, totalMs: l.totalMs || 0 })); swLaps.forEach((l, i) => { l.index = i + 1; }); renderLaps(); saveStopwatchState(); }

// ========= 電卓 =========
let calcDisplay = '0';
let calcPrevious = null;
let calcOperation = null;
let calcWaitingForInput = false;
let calcHistory = [];

function updateCalcDisplay() {
  document.getElementById('calculatorDisplay').textContent = calcDisplay;
}

function appendNumber(num) {
  if (calcWaitingForInput) {
    calcDisplay = num;
    calcWaitingForInput = false;
  } else {
    calcDisplay = calcDisplay === '0' ? num : calcDisplay + num;
  }
  updateCalcDisplay();
}

function performOperation(op) {
  const current = parseFloat(calcDisplay);
  if (calcPrevious !== null && !calcWaitingForInput) {
    const result = performCalc(calcPrevious, current, calcOperation);
    calcDisplay = String(result);
    calcPrevious = result;
    updateCalcDisplay();
  } else {
    calcPrevious = current;
  }
  calcOperation = op;
  calcWaitingForInput = true;
}

function performCalc(prev, curr, op) {
  switch(op) {
    case '+': return prev + curr;
    case '-': return prev - curr;
    case '*': return prev * curr;
    case '/': return curr !== 0 ? prev / curr : 0;
    default: return curr;
  }
}

function calculate() {
  const current = parseFloat(calcDisplay);
  if (calcPrevious !== null && calcOperation && !calcWaitingForInput) {
    const result = performCalc(calcPrevious, current, calcOperation);
    const historyItem = {
      id: Date.now(),
      expression: `${calcPrevious} ${calcOperation} ${current} = ${result}`,
      timestamp: new Date().toLocaleString('ja-JP')
    };
    calcHistory.unshift(historyItem);
    if (calcHistory.length > 50) calcHistory.pop();
    
    calcDisplay = String(result);
    calcPrevious = null;
    calcOperation = null;
    calcWaitingForInput = true;
    updateCalcDisplay();
    renderHistory();
    saveCalcState();
  }
}

function clearCalculator() {
  calcDisplay = '0';
  calcPrevious = null;
  calcOperation = null;
  calcWaitingForInput = false;
  updateCalcDisplay();
}

function clearEntry() {
  calcDisplay = '0';
  updateCalcDisplay();
}

function backspace() {
  if (calcDisplay.length > 1) {
    calcDisplay = calcDisplay.slice(0, -1);
  } else {
    calcDisplay = '0';
  }
  updateCalcDisplay();
}

function renderHistory() {
  const list = document.getElementById('calcHistory');
  if (!calcHistory.length) {
    list.innerHTML = '<p style="color:#666;">計算履歴はまだありません。</p>';
    return;
  }
  list.innerHTML = '';
  calcHistory.slice(0, 10).forEach(h => {
    const item = document.createElement('div');
    item.className = 'timer-item';
    item.innerHTML = `
      <div class="timer-info">
        <div class="timer-name">${h.expression}</div>
        <div class="timer-countdown">${h.timestamp}</div>
      </div>
      <button class="cancel-btn" onclick="deleteHistoryItem(${h.id})">削除</button>
    `;
    list.appendChild(item);
  });
}

function deleteHistoryItem(id) {
  calcHistory = calcHistory.filter(h => h.id !== id);
  renderHistory();
  saveCalcState();
}

function clearHistory() {
  calcHistory = [];
  renderHistory();
  saveCalcState();
}

function saveCalcState() {
  try {
    const data = { calcHistory };
    localStorage.setItem('mytools_calculator', JSON.stringify(data));
  } catch (e) {}
}

function loadCalcState() {
  try {
    const raw = localStorage.getItem('mytools_calculator');
    if (!raw) return;
    const data = JSON.parse(raw);
    calcHistory = Array.isArray(data.calcHistory) ? data.calcHistory : [];
    renderHistory();
  } catch (e) {}
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(calcHistory, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calc-history.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importHistoryPrompt() {
  const json = prompt('計算履歴のJSONを貼り付けてください');
  if (!json) return;
  try {
    const parsed = JSON.parse(json);
    importHistory(parsed);
  } catch (e) {
    alert('JSONの解析に失敗しました');
  }
}

function importHistory(parsed) {
  if (!Array.isArray(parsed)) return alert('不正なデータです');
  calcHistory = parsed.map(h => ({
    id: h.id || Date.now(),
    expression: h.expression || '',
    timestamp: h.timestamp || new Date().toLocaleString('ja-JP')
  }));
  renderHistory();
  saveCalcState();
}
