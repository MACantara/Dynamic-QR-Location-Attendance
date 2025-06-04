const socket = io();
let lastCount = 0;  // track previous number of check-ins

document.getElementById('generate-btn').onclick = () => {
  document.getElementById('qr-img').src = '/generate_qr?ts=' + Date.now();
};

function refreshAttendances() {
  fetch('/api/attendances')
    .then(r => r.json())
    .then(list => {
      const tbody = document.getElementById('attendances');
      tbody.innerHTML = '';
      list.forEach(data => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="py-2 px-4">${data.token}</td>
          <td class="py-2 px-4">${data.lat.toFixed(5)}</td>
          <td class="py-2 px-4">${data.lng.toFixed(5)}</td>`;
        tbody.appendChild(tr);
      });
      // if a new check-in arrived, auto‐generate a fresh QR
      if (list.length > lastCount) {
        document.getElementById('generate-btn').click();
      }
      lastCount = list.length;
    });
}

// poll every 5 seconds
setInterval(refreshAttendances, 5000);
// initial load
refreshAttendances();

let map, marker, circle, currentSettings = {};

// load from localStorage if present
function loadLocalSettings() {
  const saved = localStorage.getItem('attendanceSettings');
  return saved ? JSON.parse(saved) : null;
}

// persist to localStorage
function saveLocalSettings() {
  localStorage.setItem('attendanceSettings', JSON.stringify(currentSettings));
}

function initMap() {
  const local = loadLocalSettings();
  const settingsPromise = local
    ? Promise.resolve(local)
    : fetch('/api/settings').then(r => r.json());
  settingsPromise.then(s => {
    currentSettings = s;
    if (!local) saveLocalSettings();
    map = L.map('map').setView([s.lat, s.lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    marker = L.marker([s.lat, s.lng], {draggable:true}).addTo(map);
    circle = L.circle([s.lat, s.lng], {radius: s.radius * 1000}).addTo(map);
    const slider = document.getElementById('radius-slider'),
          display = document.getElementById('radius-value');
    slider.value = s.radius; display.innerText = s.radius;
    marker.on('dragend', e => {
      const pos = e.target.getLatLng();
      circle.setLatLng(pos);
      currentSettings.lat = pos.lat;
      currentSettings.lng = pos.lng;
    });
    slider.oninput = () => {
      currentSettings.radius = parseFloat(slider.value);
      display.innerText = slider.value;
      circle.setRadius(currentSettings.radius * 1000);
    };
  });
}

document.getElementById('save-settings').onclick = () => {
  fetch('/api/settings', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(currentSettings)
  })
  .then(() => saveLocalSettings());
};

window.onload = () => {
  initMap();
};
