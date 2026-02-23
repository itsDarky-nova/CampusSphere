'use strict';

// ============================================
// UTILITIES
// ============================================

function getLS(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showAlert(elId, msg, type = 'success') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
  setTimeout(() => { el.classList.remove('show'); }, 3500);
}

function animateCounter(el, target) {
  if (!el) return;
  const duration = 800;
  const step = Math.ceil(target / (duration / 16));
  let current = 0;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 16);
}

// ============================================
// PAGE DETECTION
// ============================================

const PAGE = (() => {
  const p = window.location.pathname;
  if (p.includes('student.html')) return 'student';
  if (p.includes('admin.html')) return 'admin';
  return 'index';
})();

// ============================================
// AUTH DATA
// ============================================

const ADMIN_EMAIL = 'admin@campussphere.com';
const ADMIN_PASS  = 'admin123';

function getStudents() { return getLS('cs_students', []); }
function setStudents(s) { setLS('cs_students', s); }
function getSession() { return getLS('cs_session', null); }
function setSession(s) { setLS('cs_session', s); }
function clearSession() { localStorage.removeItem('cs_session'); }

// ============================================
// INDEX PAGE
// ============================================

if (PAGE === 'index') {
  const sess = getSession();
  if (sess) {
    window.location.href = sess.role === 'admin' ? 'admin.html' : 'student.html';
  }

  window.openModal = function(id) {
    document.getElementById(id).classList.add('active');
  };
  window.closeModal = function(id) {
    document.getElementById(id).classList.remove('active');
  };

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('active');
    });
  });

  let loginRole = 'student';

  window.switchLoginTab = function(role) {
    loginRole = role;
    document.getElementById('loginStudentTab').classList.toggle('active', role === 'student');
    document.getElementById('loginAdminTab').classList.toggle('active', role === 'admin');
    const alertEl = document.getElementById('loginAlert');
    if (alertEl) alertEl.classList.remove('show');
  };

  window.handleLogin = function() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;

    if (!email || !pass) {
      showAlert('loginAlert', 'Please fill in all fields.', 'error');
      return;
    }

    if (loginRole === 'admin') {
      if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        setSession({ role: 'admin', email });
        window.location.href = 'admin.html';
      } else {
        showAlert('loginAlert', 'Invalid admin credentials.', 'error');
      }
      return;
    }

    const students = getStudents();
    const student = students.find(s => s.email === email && s.password === pass);
    if (student) {
      setSession({ role: 'student', email, name: student.name, id: student.id });
      window.location.href = 'student.html';
    } else {
      showAlert('loginAlert', 'Email or password is incorrect.', 'error');
    }
  };

  window.handleRegister = function() {
    const name  = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass  = document.getElementById('regPassword').value;

    if (!name || !email || !pass) {
      showAlert('registerAlert', 'Please fill in all fields.', 'error');
      return;
    }
    if (pass.length < 6) {
      showAlert('registerAlert', 'Password must be at least 6 characters.', 'error');
      return;
    }
    const students = getStudents();
    if (students.find(s => s.email === email)) {
      showAlert('registerAlert', 'This email is already registered.', 'error');
      return;
    }

    const newStudent = {
      id: generateId(), name, email, password: pass,
      createdAt: new Date().toISOString(),
      bio: '', university: '', course: '', year: ''
    };
    students.push(newStudent);
    setStudents(students);

    showAlert('registerSuccess', '🎉 Account created! You can now login.', 'success');
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';

    setTimeout(() => {
      closeModal('registerModal');
      openModal('loginModal');
    }, 1800);
  };
}

// ============================================
// SHARED SIDEBAR / SECTION LOGIC
// ============================================

if (PAGE === 'student' || PAGE === 'admin') {
  window.switchSection = function(sectionId, navEl) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sec = document.getElementById('section-' + sectionId);
    if (sec) sec.classList.add('active');
    if (navEl) navEl.classList.add('active');

    const titleMap = {
      home: 'Dashboard', profile: 'My Profile', roommate: 'Roommate Matching',
      notes: 'Notes', leave: 'Leave Request', chat: 'Campus Chat',
      announcements: 'Announcements', overview: 'Admin Overview',
      users: 'Users Management', adminNotes: 'Notes Management',
      adminLeave: 'Leave Requests', adminAnnounce: 'Announcements'
    };
    const tb = document.getElementById('topbarTitle');
    if (tb) tb.textContent = titleMap[sectionId] || 'Dashboard';

    if (window.innerWidth <= 768) closeSidebar();

    if (PAGE === 'student') {
      if (sectionId === 'home') loadStudentHome();
      if (sectionId === 'profile') loadProfile();
      if (sectionId === 'roommate') loadRoommates();
      if (sectionId === 'notes') loadNotes();
      if (sectionId === 'leave') loadLeaves();
      if (sectionId === 'chat') initChat();
      if (sectionId === 'announcements') loadAnnouncements();
    }
    if (PAGE === 'admin') {
      if (sectionId === 'overview') loadAdminOverview();
      if (sectionId === 'users') loadAdminUsers();
      if (sectionId === 'adminNotes') loadAdminNotes();
      if (sectionId === 'adminLeave') loadAdminLeave();
      if (sectionId === 'adminAnnounce') loadAdminAnnounce();
    }
  };

  window.openSidebar = function() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('mobileOverlay').classList.add('show');
  };
  window.closeSidebar = function() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('show');
  };
}

// ============================================
// STUDENT PAGE
// ============================================

if (PAGE === 'student') {
  const sess = getSession();
  if (!sess || sess.role !== 'student') window.location.href = 'index.html';

  const currentUser = sess;

  window.logout = function() {
    clearSession();
    window.location.href = 'index.html';
  };

  function initStudentPage() {
    if (!currentUser) return;
    const initials = getInitials(currentUser.name);
    const sidebarAvatar   = document.getElementById('sidebarAvatar');
    const sidebarName     = document.getElementById('sidebarName');
    const topbarAvatar    = document.getElementById('topbarAvatar');
    const chatInputAvatar = document.getElementById('chatInputAvatar');

    if (sidebarAvatar)    sidebarAvatar.textContent   = initials;
    if (sidebarName)      sidebarName.textContent     = currentUser.name;
    if (topbarAvatar)     topbarAvatar.textContent    = initials;
    if (chatInputAvatar)  chatInputAvatar.textContent = initials;

    loadStudentHome();
    updateNotifBadge();
  }

  // HOME
  function loadStudentHome() {
    const notes  = getNotes().filter(n => n.uploaderId === currentUser.id);
    const leaves = getLeaveRequests().filter(l => l.studentId === currentUser.id);
    const msgs   = getChatMessages().filter(m => m.senderId === currentUser.id);
    const anns   = getAnnouncements();

    setElText('homeNoteCount',         notes.length);
    setElText('homeLeaveCount',        leaves.length);
    setElText('homeMsgCount',          msgs.length);
    setElText('homeAnnouncementCount', anns.length);
    setElText('welcomeMsg',            `Welcome back, ${currentUser.name}! 👋`);

    const annContainer = document.getElementById('homeAnnouncements');
    if (annContainer) {
      if (anns.length === 0) {
        annContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No announcements yet</p></div>';
      } else {
        annContainer.innerHTML = anns.slice(-3).reverse().map(a => `
          <div class="announcement-card" style="margin-bottom:10px;">
            <h4>${escapeHtml(a.title)}</h4>
            <p>${escapeHtml(a.message).slice(0,100)}${a.message.length > 100 ? '...' : ''}</p>
            <div class="announcement-meta">📅 ${formatDate(a.createdAt)}</div>
          </div>`).join('');
      }
    }

    const actEl = document.getElementById('recentActivity');
    if (actEl) {
      const activities = [];
      notes.forEach(n  => activities.push({ time: n.createdAt, icon: '📚', text: `Uploaded note: ${n.title}` }));
      leaves.forEach(l => activities.push({ time: l.createdAt, icon: '📝', text: `Submitted leave request (${l.type})` }));
      msgs.forEach(m   => activities.push({ time: m.timestamp, icon: '💬', text: `Sent a message in chat` }));
      activities.sort((a,b) => new Date(b.time) - new Date(a.time));
      if (activities.length === 0) {
        actEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🌙</div><p>No recent activity</p></div>';
      } else {
        actEl.innerHTML = activities.slice(0,5).map(a => `
          <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:1.1rem;">${a.icon}</span>
            <div>
              <div style="font-size:0.88rem;">${escapeHtml(a.text)}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${formatDate(a.time)}</div>
            </div>
          </div>`).join('');
      }
    }
  }

  function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateNotifBadge() {
    const anns  = getAnnouncements();
    const badge = document.getElementById('notifBadge');
    if (badge) badge.textContent = anns.length;
  }

  // PROFILE
  function loadProfile() {
    const students = getStudents();
    const student  = students.find(s => s.id === currentUser.id);
    if (!student) return;

    const fields = ['Name','University','Course','Year','Bio'];
    fields.forEach(f => {
      const el = document.getElementById('profile' + f);
      if (el) el.value = student[f.toLowerCase()] || '';
    });

    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.textContent = getInitials(student.name);
    setElText('profileDisplayName',  student.name);
    setElText('profileDisplayEmail', student.email);
  }

  window.saveProfile = function() {
    const students = getStudents();
    const idx      = students.findIndex(s => s.id === currentUser.id);
    if (idx === -1) return;

    students[idx].name       = document.getElementById('profileName').value.trim();
    students[idx].university = document.getElementById('profileUniversity').value.trim();
    students[idx].course     = document.getElementById('profileCourse').value.trim();
    students[idx].year       = document.getElementById('profileYear').value;
    students[idx].bio        = document.getElementById('profileBio').value.trim();

    setStudents(students);
    currentUser.name = students[idx].name;
    setSession(currentUser);

    document.getElementById('sidebarName').textContent        = currentUser.name;
    document.getElementById('sidebarAvatar').textContent      = getInitials(currentUser.name);
    document.getElementById('topbarAvatar').textContent       = getInitials(currentUser.name);
    document.getElementById('chatInputAvatar').textContent    = getInitials(currentUser.name);
    document.getElementById('profileDisplayName').textContent = currentUser.name;
    document.getElementById('profileAvatar').textContent      = getInitials(currentUser.name);

    showAlert('profileAlert', '✅ Profile saved successfully!', 'success');
  };

  // ROOMMATE
  function getRoommateProfiles() { return getLS('cs_roommates', []); }
  function setRoommateProfiles(r) { setLS('cs_roommates', r); }

  function loadRoommates() {
    const profiles  = getRoommateProfiles();
    const listEl    = document.getElementById('roommateList');
    const myProfile = profiles.find(p => p.studentId === currentUser.id);

    if (myProfile) {
      document.getElementById('roommateCity').value  = myProfile.city;
      document.getElementById('roommatePrefs').value = myProfile.prefs.join(', ');
    }

    const selected = getSelectedRoommate();
    renderSelectedRoommate(selected);

    const others = profiles.filter(p => p.studentId !== currentUser.id);
    if (!listEl) return;
    if (others.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No students listed yet. Be the first!</p></div>';
      return;
    }

    listEl.innerHTML = others.map(p => {
      const isSelected = selected && selected.studentId === p.studentId;
      return `
        <div class="roommate-card ${isSelected ? 'selected' : ''}" onclick="selectRoommate('${p.studentId}')">
          <div class="avatar avatar-lg" style="background:linear-gradient(135deg,${randomColor(p.studentId)});">${getInitials(p.name)}</div>
          <h4>${escapeHtml(p.name)}</h4>
          <div class="city">📍 ${escapeHtml(p.city)}</div>
          <div class="prefs">
            ${p.prefs.map(pr => `<span class="tag">${escapeHtml(pr)}</span>`).join('')}
          </div>
          ${isSelected
            ? `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();clearRoommate()">✕ Remove</button>`
            : `<button class="btn btn-sm btn-success">🤝 Select</button>`}
        </div>`;
    }).join('');
  }

  function randomColor(seed) {
    const colors = [
      '#6C63FF,#8B85FF','#FF6B6B,#FF8E8E','#43D9B0,#6BEBC8',
      '#F7B731,#FECB5A','#A29BFE,#C7C5FF','#FD79A8,#FCA5C7'
    ];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xFFFFFF;
    return colors[Math.abs(h) % colors.length];
  }

  window.saveRoommateProfile = function() {
    const city  = document.getElementById('roommateCity').value.trim();
    const prefs = document.getElementById('roommatePrefs').value.split(',').map(p => p.trim()).filter(Boolean);
    if (!city) { alert('Please enter your city.'); return; }

    const profiles = getRoommateProfiles();
    const idx      = profiles.findIndex(p => p.studentId === currentUser.id);
    const profile  = { studentId: currentUser.id, name: currentUser.name, city, prefs };

    if (idx === -1) profiles.push(profile);
    else profiles[idx] = profile;

    setRoommateProfiles(profiles);
    loadRoommates();
  };

  function getSelectedRoommate()  { return getLS(`cs_selected_roommate_${currentUser.id}`, null); }
  function setSelectedRoommate(r) { setLS(`cs_selected_roommate_${currentUser.id}`, r); }

  window.selectRoommate = function(studentId) {
    const profile = getRoommateProfiles().find(p => p.studentId === studentId);
    if (profile) { setSelectedRoommate(profile); loadRoommates(); }
  };

  window.clearRoommate = function() {
    localStorage.removeItem(`cs_selected_roommate_${currentUser.id}`);
    loadRoommates();
  };

  function renderSelectedRoommate(sel) {
    const el = document.getElementById('selectedRoommate');
    if (!el) return;
    if (!sel) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🤝</div><p>No roommate selected yet</p></div>';
      return;
    }
    el.innerHTML = `
      <div style="text-align:center;padding:12px;">
        <div class="avatar avatar-lg" style="margin:0 auto 10px;background:linear-gradient(135deg,${randomColor(sel.studentId)});">${getInitials(sel.name)}</div>
        <h4 style="font-size:1rem;font-weight:600;">${escapeHtml(sel.name)}</h4>
        <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:8px;">📍 ${escapeHtml(sel.city)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:12px;">
          ${sel.prefs.map(p => `<span class="tag">${escapeHtml(p)}</span>`).join('')}
        </div>
        <button class="btn btn-sm btn-danger" onclick="clearRoommate()">✕ Remove</button>
      </div>`;
  }

  // NOTES
  function getNotes()  { return getLS('cs_notes', []); }
  function setNotes(n) { setLS('cs_notes', n); }

  function loadNotes() {
    const notes  = getNotes();
    const listEl = document.getElementById('notesList');
    if (!listEl) return;
    if (notes.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No notes uploaded yet</p></div>';
      return;
    }
    listEl.innerHTML = notes.slice().reverse().map(n => `
      <div class="item-card">
        <div class="item-icon">📄</div>
        <div class="item-info">
          <strong>${escapeHtml(n.title)}</strong>
          <span>${escapeHtml(n.subject)} · ${escapeHtml(n.description || '')} · by ${escapeHtml(n.uploaderName)} · ${formatDate(n.createdAt)}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-ghost" onclick="downloadNote('${n.id}')">⬇ Download</button>
          ${n.uploaderId === currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deleteNote('${n.id}')">🗑</button>` : ''}
        </div>
      </div>`).join('');
  }

  window.addNote = function() {
    const title   = document.getElementById('noteTitle').value.trim();
    const subject = document.getElementById('noteSubject').value.trim();
    const fileEl  = document.getElementById('noteFile');
    const desc    = document.getElementById('noteDesc').value.trim();

    if (!title || !subject) {
      showAlert('notesAlert', 'Please fill in title and subject.', 'error');
      return;
    }

    const fileName = fileEl.files[0] ? fileEl.files[0].name : 'No file attached';
    const note = {
      id: generateId(), title, subject, description: desc, fileName,
      uploaderId: currentUser.id, uploaderName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    const notes = getNotes();
    notes.push(note);
    setNotes(notes);

    document.getElementById('noteTitle').value   = '';
    document.getElementById('noteSubject').value = '';
    document.getElementById('noteFile').value    = '';
    document.getElementById('noteDesc').value    = '';

    showAlert('notesAlert', '✅ Note uploaded successfully!', 'success');
    loadNotes();
  };

  window.deleteNote = function(id) {
    if (!confirm('Delete this note?')) return;
    setNotes(getNotes().filter(n => n.id !== id));
    loadNotes();
  };

  window.downloadNote = function(id) {
    const note = getNotes().find(n => n.id === id);
    if (!note) return;
    const blob = new Blob([`Note: ${note.title}\nSubject: ${note.subject}\nDescription: ${note.description || 'N/A'}\nUploaded by: ${note.uploaderName}\nFile: ${note.fileName}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${note.title.replace(/\s+/g,'_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // LEAVE
  function getLeaveRequests()  { return getLS('cs_leaves', []); }
  function setLeaveRequests(l) { setLS('cs_leaves', l); }

  function loadLeaves() {
    const leaves = getLeaveRequests().filter(l => l.studentId === currentUser.id);
    const listEl = document.getElementById('leaveList');

    setElText('leavePendingCount',  leaves.filter(l => l.status === 'Pending').length);
    setElText('leaveApprovedCount', leaves.filter(l => l.status === 'Approved').length);
    setElText('leaveRejectedCount', leaves.filter(l => l.status === 'Rejected').length);

    if (!listEl) return;
    if (leaves.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No leave requests submitted yet</p></div>';
      return;
    }
    listEl.innerHTML = leaves.slice().reverse().map(l => `
      <div class="item-card">
        <div class="item-icon">📋</div>
        <div class="item-info">
          <strong>${escapeHtml(l.type)} Leave</strong>
          <span>${formatDate(l.from)} → ${formatDate(l.to)} · ${escapeHtml(l.reason).slice(0,60)}${l.reason.length > 60 ? '...' : ''}</span>
        </div>
        <div class="item-actions">
          <span class="leave-status ${l.status.toLowerCase()}">${statusIcon(l.status)} ${l.status}</span>
        </div>
      </div>`).join('');
  }

  function statusIcon(s) {
    return s === 'Approved' ? '✅' : s === 'Rejected' ? '❌' : '⏳';
  }

  window.submitLeave = function() {
    const type   = document.getElementById('leaveType').value;
    const from   = document.getElementById('leaveFrom').value;
    const to     = document.getElementById('leaveTo').value;
    const reason = document.getElementById('leaveReason').value.trim();

    if (!type || !from || !to || !reason) {
      showAlert('leaveAlert', 'Please fill in all fields.', 'error');
      return;
    }
    if (new Date(to) < new Date(from)) {
      showAlert('leaveAlert', 'End date must be after start date.', 'error');
      return;
    }

    const leave = {
      id: generateId(), type, from, to, reason,
      studentId: currentUser.id, studentName: currentUser.name,
      status: 'Pending', createdAt: new Date().toISOString()
    };

    const leaves = getLeaveRequests();
    leaves.push(leave);
    setLeaveRequests(leaves);

    document.getElementById('leaveType').value   = '';
    document.getElementById('leaveFrom').value   = '';
    document.getElementById('leaveTo').value     = '';
    document.getElementById('leaveReason').value = '';

    showAlert('leaveAlert', '✅ Leave request submitted! Awaiting admin approval.', 'success');
    loadLeaves();
  };

  // CHAT
  function getChatMessages()  { return getLS('cs_chat', []); }
  function setChatMessages(m) { setLS('cs_chat', m); }

  let chatPollInterval = null;

  function initChat() {
    renderMessages();
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(renderMessages, 2000);
  }

  function renderMessages() {
    const msgs   = getChatMessages();
    const chatEl = document.getElementById('chatMessages');
    if (!chatEl) return;

    if (msgs.length === 0) {
      chatEl.innerHTML = '<div class="empty-state"><div class="empty-icon">💭</div><p>No messages yet. Start the conversation!</p></div>';
      return;
    }

    chatEl.innerHTML = msgs.map(m => {
      const isOwn = m.senderId === currentUser.id;
      return `
        <div class="chat-msg ${isOwn ? 'own' : ''}">
          <div class="msg-avatar" style="background:linear-gradient(135deg,${randomColor(m.senderId)});">${getInitials(m.senderName)}</div>
          <div class="msg-bubble">
            <div class="msg-name">${escapeHtml(m.senderName)}</div>
            <div class="msg-text">${escapeHtml(m.text)}</div>
            <div class="msg-time">${formatTime(m.timestamp)}</div>
          </div>
        </div>`;
    }).join('');

    chatEl.scrollTop = chatEl.scrollHeight;
  }

  window.sendMessage = function() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const msgs = getChatMessages();
    msgs.push({
      id: generateId(), text,
      senderId: currentUser.id, senderName: currentUser.name,
      timestamp: new Date().toISOString()
    });
    setChatMessages(msgs);
    input.value = '';
    renderMessages();
  };

  // ANNOUNCEMENTS
  function getAnnouncements() { return getLS('cs_announcements', []); }

  function loadAnnouncements() {
    const anns   = getAnnouncements();
    const listEl = document.getElementById('announcementList');
    if (!listEl) return;

    if (anns.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No announcements yet</p></div>';
      return;
    }

    listEl.innerHTML = anns.slice().reverse().map(a => {
      const priorityColor = a.priority === 'urgent' ? '#FF4B4B' : a.priority === 'important' ? '#F7B731' : 'var(--primary)';
      return `
        <div class="announcement-card" style="border-left-color:${priorityColor};">
          ${a.priority !== 'normal' ? `<span style="background:${priorityColor}20;color:${priorityColor};padding:2px 10px;border-radius:50px;font-size:0.72rem;font-weight:600;text-transform:uppercase;display:inline-block;margin-bottom:6px;">${a.priority}</span>` : ''}
          <h4>${escapeHtml(a.title)}</h4>
          <p>${escapeHtml(a.message)}</p>
          <div class="announcement-meta">📅 ${formatDate(a.createdAt)} · by Admin</div>
        </div>`;
    }).join('');

    updateNotifBadge();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  initStudentPage();
}

// ============================================
// ADMIN PAGE
// ============================================

if (PAGE === 'admin') {
  const sess = getSession();
  if (!sess || sess.role !== 'admin') window.location.href = 'index.html';

  window.adminLogout = function() {
    clearSession();
    window.location.href = 'index.html';
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function getStudents()       { return getLS('cs_students', []); }
  function getNotes()          { return getLS('cs_notes', []); }
  function getLeaveRequests()  { return getLS('cs_leaves', []); }
  function getAnnouncements()  { return getLS('cs_announcements', []); }
  function setAnnouncements(a) { setLS('cs_announcements', a); }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // OVERVIEW
  function loadAdminOverview() {
    const students = getStudents();
    const notes    = getNotes();
    const leaves   = getLeaveRequests();
    const anns     = getAnnouncements();

    animateCounter(document.getElementById('totalStudents'),      students.length);
    animateCounter(document.getElementById('totalNotes'),         notes.length);
    animateCounter(document.getElementById('totalLeaves'),        leaves.length);
    animateCounter(document.getElementById('totalAnnouncements'), anns.length);

    const pending = leaves.filter(l => l.status === 'Pending');
    const overviewLeaves = document.getElementById('overviewLeaves');
    if (overviewLeaves) {
      overviewLeaves.innerHTML = pending.length === 0
        ? '<div class="empty-state"><div class="empty-icon">✅</div><p>No pending requests</p></div>'
        : pending.slice(0,4).map(l => `
            <div class="item-card" style="margin-bottom:8px;">
              <div class="item-icon">📝</div>
              <div class="item-info">
                <strong>${escapeHtml(l.studentName)}</strong>
                <span>${escapeHtml(l.type)} · ${formatDate(l.from)}</span>
              </div>
              <span class="leave-status pending">⏳ Pending</span>
            </div>`).join('');
    }

    const overviewStudents = document.getElementById('overviewStudents');
    if (overviewStudents) {
      overviewStudents.innerHTML = students.length === 0
        ? '<div class="empty-state"><div class="empty-icon">👥</div><p>No students yet</p></div>'
        : students.slice(-4).reverse().map(s => `
            <div class="item-card" style="margin-bottom:8px;">
              <div class="avatar" style="width:32px;height:32px;font-size:0.75rem;background:linear-gradient(135deg,#6C63FF,#8B85FF);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;">${getInitials(s.name)}</div>
              <div class="item-info">
                <strong>${escapeHtml(s.name)}</strong>
                <span>${escapeHtml(s.email)} · Joined ${formatDate(s.createdAt)}</span>
              </div>
            </div>`).join('');
    }
  }

  // USERS
  function loadAdminUsers() {
    const students = getStudents();
    const tbody    = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No students registered yet</td></tr>';
      return;
    }

    const notes  = getNotes();
    const leaves = getLeaveRequests();

    tbody.innerHTML = students.map((s, i) => {
      const noteCount  = notes.filter(n => n.uploaderId === s.id).length;
      const leaveCount = leaves.filter(l => l.studentId === s.id).length;
      return `
        <tr>
          <td>${i + 1}</td>
          <td><div style="display:flex;align-items:center;gap:8px;"><div style="width:32px;height:32px;font-size:0.75rem;background:linear-gradient(135deg,#6C63FF,#8B85FF);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;">${getInitials(s.name)}</div>${escapeHtml(s.name)}</div></td>
          <td>${escapeHtml(s.email)}</td>
          <td>${formatDate(s.createdAt)}</td>
          <td><span class="tag">${noteCount}</span></td>
          <td><span class="tag">${leaveCount}</span></td>
          <td><button class="btn btn-sm btn-danger" onclick="adminDeleteStudent('${s.id}')">🗑 Delete</button></td>
        </tr>`;
    }).join('');
  }

  window.adminDeleteStudent = function(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    setLS('cs_students', getStudents().filter(s => s.id !== id));
    loadAdminUsers();
    loadAdminOverview();
  };

  // NOTES
  function loadAdminNotes() {
    const notes = getNotes();
    const tbody = document.getElementById('adminNotesBody');
    if (!tbody) return;

    if (notes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No notes uploaded yet</td></tr>';
      return;
    }

    tbody.innerHTML = notes.slice().reverse().map((n, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(n.title)}</strong></td>
        <td>${escapeHtml(n.subject)}</td>
        <td>${escapeHtml(n.uploaderName)}</td>
        <td>${formatDate(n.createdAt)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="adminDeleteNote('${n.id}')">🗑 Delete</button></td>
      </tr>`).join('');
  }

  window.adminDeleteNote = function(id) {
    if (!confirm('Delete this note?')) return;
    setLS('cs_notes', getNotes().filter(n => n.id !== id));
    loadAdminNotes();
  };

  // LEAVE
  function loadAdminLeave() {
    const leaves = getLeaveRequests();
    const tbody  = document.getElementById('adminLeaveBody');
    if (!tbody) return;

    if (leaves.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No leave requests yet</td></tr>';
      return;
    }

    tbody.innerHTML = leaves.slice().reverse().map((l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(l.studentName)}</td>
        <td>${escapeHtml(l.type)}</td>
        <td>${formatDate(l.from)}</td>
        <td>${formatDate(l.to)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(l.reason)}">${escapeHtml(l.reason)}</td>
        <td><span class="leave-status ${l.status.toLowerCase()}">${statusIcon(l.status)} ${l.status}</span></td>
        <td>
          ${l.status === 'Pending'
            ? `<button class="btn btn-sm btn-success" onclick="updateLeaveStatus('${l.id}','Approved')">✅</button>
               <button class="btn btn-sm btn-danger"  onclick="updateLeaveStatus('${l.id}','Rejected')">❌</button>`
            : `<span style="color:var(--text-muted);font-size:0.82rem;">—</span>`}
        </td>
      </tr>`).join('');
  }

  function statusIcon(s) {
    return s === 'Approved' ? '✅' : s === 'Rejected' ? '❌' : '⏳';
  }

  window.updateLeaveStatus = function(id, status) {
    const leaves = getLeaveRequests();
    const idx    = leaves.findIndex(l => l.id === id);
    if (idx !== -1) {
      leaves[idx].status = status;
      setLS('cs_leaves', leaves);
      loadAdminLeave();
    }
  };

  // ANNOUNCEMENTS
  function loadAdminAnnounce() {
    const anns   = getAnnouncements();
    const listEl = document.getElementById('adminAnnounceList');

    const countEl = document.getElementById('announceCountStat');
    const notifEl = document.getElementById('studentsNotifiedStat');
    if (countEl) countEl.textContent = anns.length;
    if (notifEl) notifEl.textContent = getStudents().length;

    if (!listEl) return;
    if (anns.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No announcements posted yet</p></div>';
      return;
    }

    listEl.innerHTML = anns.slice().reverse().map(a => {
      const priorityColor = a.priority === 'urgent' ? '#FF4B4B' : a.priority === 'important' ? '#F7B731' : 'var(--primary)';
      return `
        <div class="announcement-card" style="border-left-color:${priorityColor};display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            ${a.priority !== 'normal' ? `<span style="background:${priorityColor}20;color:${priorityColor};padding:2px 10px;border-radius:50px;font-size:0.72rem;font-weight:600;text-transform:uppercase;display:inline-block;margin-bottom:6px;">${a.priority}</span>` : ''}
            <h4>${escapeHtml(a.title)}</h4>
            <p>${escapeHtml(a.message)}</p>
            <div class="announcement-meta">📅 ${formatDate(a.createdAt)}</div>
          </div>
          <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${a.id}')">🗑</button>
        </div>`;
    }).join('');
  }

  window.postAnnouncement = function() {
    const title    = document.getElementById('announceTitle').value.trim();
    const message  = document.getElementById('announceMsg').value.trim();
    const priority = document.getElementById('announcePriority').value;

    if (!title || !message) {
      showAlert('announceAlert', 'Please fill in title and message.', 'error');
      return;
    }

    const anns = getAnnouncements();
    anns.push({ id: generateId(), title, message, priority, createdAt: new Date().toISOString() });
    setAnnouncements(anns);

    document.getElementById('announceTitle').value    = '';
    document.getElementById('announceMsg').value      = '';
    document.getElementById('announcePriority').value = 'normal';

    showAlert('announceAlert', '✅ Announcement posted successfully!', 'success');
    loadAdminAnnounce();
  };

  window.deleteAnnouncement = function(id) {
    if (!confirm('Delete this announcement?')) return;
    setAnnouncements(getAnnouncements().filter(a => a.id !== id));
    loadAdminAnnounce();
  };

  loadAdminOverview();
}