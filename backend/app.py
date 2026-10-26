from flask import Flask, jsonify
from flask_cors import CORS
from database import init_db
from routes.directory import directory_bp
from routes.auth import auth_bp
from routes.members import members_bp
from routes.announcements import announcements_bp


app = Flask(__name__)
CORS(app)

# Initialize database tables on startup
init_db()

# Register Blueprints
app.register_blueprint(directory_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(members_bp)
app.register_blueprint(announcements_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "success", "message": "Student Org Platform API is running!"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)