def create_app():
    from flask import Flask
    from flask_cors import CORS

    from app.config import config
    from app.routes.auth_api import bp as auth_bp
    from app.routes.fragments_api import bp as fragments_bp
    from app.routes.friends_api import bp as friends_bp
    from app.routes.messages_api import bp as messages_bp
    from app.routes.read_api import bp as api_bp
    from app.routes.xiqi_admin_api import bp as xiqi_admin_bp

    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": config.CORS_ORIGINS,
                "supports_credentials": True,
            }
        },
    )

    @app.get("/")
    def index():
        return {
            "service": "GrunRay wiki API",
            "content_root": str(config.CONTENT_ROOT),
        }

    app.register_blueprint(api_bp)
    app.register_blueprint(fragments_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(friends_bp)
    app.register_blueprint(xiqi_admin_bp)
    return app
