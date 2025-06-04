window.onload = () => {
  const status = document.getElementById('status');
  const btn = document.getElementById('checkin-btn');
  
  btn.onclick = () => {
    status.innerText = 'Obtaining location…';
    if (!navigator.geolocation) {
      status.innerText = 'Geolocation unsupported.';
      return;
    }
    
    navigator.geolocation.getCurrentPosition(pos => {
      fetch('/checkin', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          token: TOKEN,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: document.getElementById('name').value,
          course: document.getElementById('course').value,
          year: document.getElementById('year').value
        })
      })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          status.innerHTML = '<i class="bi bi-check-circle-fill text-green-500"></i> Checked in!';
        } else {
          status.innerHTML = '<i class="bi bi-x-circle-fill text-red-500"></i> ' + res.message;
        }
      });
    }, () => {
      status.innerText = 'Location permission denied.';
    });
  };
};
