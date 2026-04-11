from flask import Flask
from flask_cors import CORS

from app.config import config
from app.routes.read_api import bp as api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    @app.get("/")
    def index():
        return {
            "service": "GrunRay wiki API",
            "content_root": str(config.CONTENT_ROOT),
        }

    app.register_blueprint(api_bp)
    return app
