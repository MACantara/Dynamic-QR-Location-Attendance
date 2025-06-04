const socket = io();
document.getElementById('generate-btn').onclick = () => {
  document.getElementById('qr-img').src = '/generate_qr?ts=' + Date.now();
};
socket.on('new_attendance', data => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="py-2 px-4">${data.token}</td>
    <td class="py-2 px-4">${data.lat.toFixed(5)}</td>
    <td class="py-2 px-4">${data.lng.toFixed(5)}</td>`;
  document.getElementById('attendances').appendChild(tr);
});
