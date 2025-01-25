import logging
import os
import yaml
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from subprocess import Popen, PIPE
import difflib

app = Flask(__name__, static_folder="static")
app.secret_key = "your_secret_key"
logging.basicConfig(level=logging.INFO)
# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# Dummy user for login
class User(UserMixin):
    def __init__(self, id):
        self.id = id

# Replace with a database or secure user store in production
USERS = {"admin": "password"}

@login_manager.user_loader
def load_user(user_id):
    return User(user_id) if user_id in USERS else None

# Configuration file path
CONFIG_FILE_PATH = "./config.yaml"
OTEL_COLLECTOR_SERVICE = "otelcol-contrib"

# Routes
@app.route("/")
@login_required
def index():
    try:
        with open(CONFIG_FILE_PATH, "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        flash("Configuration file not found.", "error")
        config = {}
    except yaml.YAMLError as e:
        flash(f"Invalid configuration file: {e}", "error")
        config = {}

    return render_template("index.html", config=config)

@app.route("/save", methods=["POST"])
@login_required
def save_config():
    logging.info("Saving configuration.")
    try:
        new_config = request.json        
        with open(CONFIG_FILE_PATH, "r") as f:
            current_config = yaml.safe_load(f)
        
        if yaml.dump(new_config) != yaml.dump(current_config):
            with open(CONFIG_FILE_PATH, "w") as f:
                yaml.safe_dump(new_config, f)

            # Restart the OpenTelemetry Collector
            # process = Popen(["systemctl", "restart", OTEL_COLLECTOR_SERVICE], stdout=PIPE, stderr=PIPE)
            process = Popen(["echo", OTEL_COLLECTOR_SERVICE], stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            if process.returncode != 0:
                flash(f"Failed to restart collector: {stderr.decode()}", "error")
            else:
                flash(f"Configuration saved and OpenTelemetry Collector restarted. stdout: {stdout}", "success")
        else:
            flash("No changes detected in the configuration.", "info")
    except yaml.YAMLError as e:
        flash(f"Invalid configuration: {e}", "error")
        return "Invalid configuration", 400
    except Exception as e:
        flash(f"Error saving configuration: {e}", "error")
        return "Error saving configuration", 500
    return redirect(url_for("index"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        if username in USERS and USERS[username] == password:
            login_user(User(username))
            return redirect(url_for("index"))
        else:
            flash("Invalid credentials.", "error")
    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))

if __name__ == "__main__":
    logging.info("Starting the application.")
    app.run(host="0.0.0.0", port=5050, debug=True)

