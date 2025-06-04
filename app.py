import random, string, time
from io import BytesIO
from math import radians, sin, cos, sqrt, atan2

from flask import Flask, render_template, request, send_file, jsonify
from flask_socketio import SocketIO
import qrcode

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

# simple in-memory store
active_tokens = {}      # token -> {'timestamp':..., 'used':False}
attendances = []        # list of check-in records

# dynamic settings
settings = {
    'lat': 14.395673,
    'lng': 120.976068,
    'radius': 0.1      # km
}

def within_radius(lat, lng):
    R = 6371
    dlat = radians(lat - settings['lat'])
    dlon = radians(lng - settings['lng'])
    a = sin(dlat/2)**2 + cos(radians(lat))*cos(radians(settings['lat']))*sin(dlon/2)**2
    c = 2*atan2(sqrt(a), sqrt(1-a))
    return (R * c) <= settings['radius']

@app.route('/')
def admin_dashboard():
    return render_template('dashboard.html')

@app.route('/generate_qr')
def generate_qr():
    token = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    active_tokens[token] = {'timestamp': time.time(), 'used': False}
    qr_data = request.host_url + 'scan/' + token
    img = qrcode.make(qr_data)
    buf = BytesIO(); img.save(buf); buf.seek(0)
    return send_file(buf, mimetype='image/png')

@app.route('/scan/<token>')
def scan(token):
    if token not in active_tokens or active_tokens[token]['used']:
        return "Invalid or expired QR code", 400
    return render_template('index.html', token=token)

@app.route('/checkin', methods=['POST'])
def checkin():
    data = request.json or {}
    token = data.get('token','')
    lat = float(data.get('lat',0))
    lng = float(data.get('lng',0))
    if token not in active_tokens or active_tokens[token]['used']:
        return jsonify(status='error', message='Invalid or already used token')
    if not within_radius(lat, lng):
        return jsonify(status='error', message='Outside of allowed location')
    active_tokens[token]['used'] = True
    attendances.append({'token':token,'lat':lat,'lng':lng,'time':time.time()})
    socketio.emit('new_attendance', {'token':token,'lat':lat,'lng':lng})
    return jsonify(status='success')

@app.route('/api/attendances')
def api_attendances():
    # return all recorded check-ins as JSON
    return jsonify(attendances)

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    if request.method == 'GET':
        return jsonify(settings)
    data = request.json or {}
    # update only provided fields
    for k in ('lat','lng','radius'):
        if k in data:
            settings[k] = float(data[k])
    return jsonify(settings)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
