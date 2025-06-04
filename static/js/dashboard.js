const socket = io();
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
    });
}

// poll every 5 seconds
setInterval(refreshAttendances, 5000);
// initial load
refreshAttendances();
