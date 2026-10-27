"""
permissions.py — who is calling the API, and what may they do in a given club.

Rules (edit the constants below to change them):
  * admin (users.role == 'admin')  -> full access to every club
  * club role in MANAGER_ROLES     -> may add / edit / remove members of THAT club only
  * club role in ROLE_ASSIGNERS    -> may also change members' club roles
  * anyone else                    -> read-only
"""
from functools import wraps
from flask import request, jsonify, g, current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from database import get_db_connection

# Fixed list so a typo can never create a role the permission checks don't understand
CLUB_ROLES = ['President', 'Vice President', 'VP External', 'Secretary',
              'Treasurer', 'Auditor', 'PRO', 'Member']

MANAGER_ROLES = {'President', 'Vice President', 'Secretary'}   # can add/edit/remove members
ROLE_ASSIGNERS = {'President'}                                   # can promote/demote (besides admin)

TOKEN_MAX_AGE = 60 * 60 * 12   # tokens expire after 12 hours


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='auth-token')


def make_token(user_id):
    return _serializer().dumps({'uid': user_id})


def current_user():
    """Return the logged-in user (dict) from the Authorization header, or None."""
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None
    try:
        data = _serializer().loads(header[7:], max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    conn = get_db_connection()
    try:
        # Role is re-read from the database every request, so a role change applies immediately
        row = conn.execute('SELECT id, name, email, role FROM users WHERE id = ?',
                           (data.get('uid'),)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def club_permissions(user, club_id):
    """What this user may do in this club."""
    perms = {'logged_in': bool(user), 'club_role': None,
             'can_manage': False, 'can_assign_roles': False}
    if not user:
        return perms
    if user['role'] == 'admin':
        perms.update(can_manage=True, can_assign_roles=True)
        return perms
    conn = get_db_connection()
    try:
        row = conn.execute('SELECT role_in_club FROM club_members WHERE club_id = ? AND user_id = ?',
                           (club_id, user['id'])).fetchone()
    finally:
        conn.close()
    role = row['role_in_club'] if row else None
    perms.update(club_role=role,
                 can_manage=role in MANAGER_ROLES,
                 can_assign_roles=role in ROLE_ASSIGNERS)
    return perms


def require_club_manager(f):
    """Route decorator: 401 if not logged in, 403 if not admin / manager of THIS club."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"message": "Please log in first."}), 401
        perms = club_permissions(user, kwargs['club_id'])
        if not perms['can_manage']:
            return jsonify({"message": "You don't have permission to manage this club."}), 403
        g.user, g.perms = user, perms
        return f(*args, **kwargs)
    return wrapper
