from flask import Flask, render_template
import requests  # Ensure requests is imported

app = Flask(__name__)


@app.route("/")  # Map the index route
def index():
    return render_template("index.html")


@app.route("/test-bbox")  # Map the test route
def test_bbox():
    try:
        response = requests.get("http://localhost:6767/xyz/water_tiles/8/46/170.mvt")
        return f"BBOX Server Status: {response.status_code}", response.status_code
    except Exception as e:
        return f"Error connecting to BBOX: {str(e)}", 500


if __name__ == "__main__":
    # Run the Flask app with debug mode enabled for easier debugging
    app.run(host="0.0.0.0", port=5000, debug=True)
