"""
app/extensions.py — Flask Extension Instances
==============================================
Extension objects are created here (un-initialized) and then bound to
the real Flask app inside create_app() via `ext.init_app(flask_app)`.

This pattern breaks circular imports: any module can import `bcrypt` or
`jwt` from here without importing the full app factory.
"""

from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager

# Created here — NOT yet bound to a Flask app instance
bcrypt = Bcrypt()
jwt    = JWTManager()
