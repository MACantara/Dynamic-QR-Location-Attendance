import random, string, time
from io import BytesIO
from math import radians, sin, cos, sqrt, atan2

from flask import Flask, render_template, request, send_file, jsonify
import qrcode

app = Flask(__name__)

# simple in-memory store
active_tokens = {}      # token -> {'timestamp':..., 'used':False}
attendances = []        # list of check-in records
denied_attempts = []    # store out-of-radius scans
new_qr_trigger = {'timestamp': 0}  # trigger for new QR generation

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

def extract_device_signature(ua):
    """Extract a simplified device signature from User-Agent"""
    ua = ua.lower()
    # Extract key identifying parts
    if 'iphone' in ua:
        return 'iphone'
    elif 'android' in ua:
        return 'android'
    elif 'ipad' in ua:
        return 'ipad'
    elif 'mobile' in ua:
        return 'mobile'
    else:
        return 'desktop'

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

    ua = request.headers.get('User-Agent', '')
    device_sig = extract_device_signature(ua)
    info = active_tokens[token]
    
    # first time opening - record device signature and trigger new QR
    if not info.get('opened', False):
        info['opened'] = True
        info['device_signature'] = device_sig
        new_qr_trigger['timestamp'] = time.time()
    # check if same device type
    elif info.get('device_signature') != device_sig:
        return "<h3>QR can only be used on the same type of device that first opened it.</h3>", 400

    return render_template('index.html', token=token)

@app.route('/checkin', methods=['POST'])
def checkin():
    data = request.json or {}
    token = data.get('token','')
    lat = float(data.get('lat',0))
    lng = float(data.get('lng',0))
    name = data.get('name','')
    course = data.get('course','')
    year = data.get('year','')
    
    if token not in active_tokens or active_tokens[token]['used']:
        denied_attempts.append({
            'token': token, 'lat': lat, 'lng': lng, 'time': time.time(),
            'reason': 'invalid_or_used', 'name': name, 'course': course, 'year': year
        })
        return jsonify(status='error', message='Invalid or already used token')
    if not within_radius(lat, lng):
        denied_attempts.append({
            'token': token, 'lat': lat, 'lng': lng, 'time': time.time(),
            'reason': 'outside', 'name': name, 'course': course, 'year': year
        })
        return jsonify(status='error', message='Outside of allowed location')
    
    active_tokens[token]['used'] = True
    attendances.append({
        'token': token, 'lat': lat, 'lng': lng, 'time': time.time(),
        'name': name, 'course': course, 'year': year
    })
    return jsonify(status='success')

@app.route('/api/attendances')
def api_attendances():
    return jsonify(attendances)

@app.route('/api/denied')
def api_denied():
    return jsonify(denied_attempts)

@app.route('/api/new_qr_check')
def api_new_qr_check():
    return jsonify({'timestamp': new_qr_trigger['timestamp']})

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    if request.method == 'GET':
        return jsonify(settings)
    data = request.json or {}
    for k in ('lat','lng','radius'):
        if k in data:
            settings[k] = float(data[k])
    return jsonify(settings)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
