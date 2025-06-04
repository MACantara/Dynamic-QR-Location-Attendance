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

function initMap() {
  fetch('/api/settings')
    .then(r => r.json())
    .then(s => {
      currentSettings = s;
      // init map
      map = L.map('map').setView([s.lat, s.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      marker = L.marker([s.lat, s.lng], {draggable:true}).addTo(map);
      circle = L.circle([s.lat, s.lng], {radius: s.radius * 1000}).addTo(map);
      // slider
      const slider = document.getElementById('radius-slider'),
            display = document.getElementById('radius-value');
      slider.value = s.radius; display.innerText = s.radius;
      // events
      marker.on('dragend', e => {
        const pos = e.target.getLatLng();
        circle.setLatLng(pos);
        currentSettings.lat = pos.lat; currentSettings.lng = pos.lng;
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
  });
};

window.onload = () => {
  initMap();
};
