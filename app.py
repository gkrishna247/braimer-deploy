import io
import os
import random
from typing import Tuple, Dict, Any

import cv2
import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from PIL import Image

from utils import preprocess_for_model, run_model_prediction

app = Flask(__name__, static_folder='frontend')
# Configure max content length (e.g., 5MB)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
CORS(app)

# Allowed extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename: str) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Model Loading ---
MODEL_LOAD_PATH = 'effnet.h5'
loaded_model = None

try:
    if os.path.exists(MODEL_LOAD_PATH):
        loaded_model = tf.keras.models.load_model(MODEL_LOAD_PATH)
        print(f"Model '{MODEL_LOAD_PATH}' loaded successfully.")
    else:
        print(f"Error: Model file not found at '{MODEL_LOAD_PATH}'. The /analyze endpoint will not work.")
except Exception as e:
    print(f"Error loading Keras model: {e}")

# Dummy user database (replace with a real database in production)
users: Dict[str, Dict[str, str]] = {
    "test@example.com": {"password": "password", "name": "Test User"}
}


@app.route('/')
def serve_index() -> Response:
    """
    Serves the index.html file for the root URL.

    Returns:
        Response: The index.html file.
    """
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path: str) -> Response:
    """
    Serves static files from the frontend directory.

    Args:
        path (str): The path to the static file.

    Returns:
        Response: The requested static file.
    """
    return send_from_directory(app.static_folder, path)


@app.route('/login', methods=['POST'])
def login() -> Tuple[Response, int]:
    """
    Handles user login authentication.

    Expects a JSON payload with 'email' and 'password'.

    Returns:
        Tuple[Response, int]: A JSON response containing the login status and token,
                              and the HTTP status code.
    """
    data: Dict[str, Any] = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users.get(email)

    if user and user['password'] == password:
        session_token = f"dummy_token_for_{email.split('@')[0]}_{random.randint(10000, 99999)}"
        user_name = user.get('name', 'User')
        return jsonify({
            'message': 'Login successful',
            'session_token': session_token,
            'user_name': user_name
        }), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401


@app.route('/register', methods=['POST'])
def register() -> Tuple[Response, int]:
    """
    Handles user registration.

    Expects a JSON payload with 'email', 'password', and 'name'.

    Returns:
        Tuple[Response, int]: A JSON response indicating success or failure,
                              and the HTTP status code.
    """
    data: Dict[str, Any] = request.get_json()
    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({"message": "Missing email, password, or name"}), 400

    if not isinstance(email, str) or not isinstance(password, str) or not isinstance(name, str):
        return jsonify({"message": "Email, password, and name must be strings"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters long"}), 400

    if email in users:
        return jsonify({"message": "Email already registered"}), 409

    users[email] = {"password": password, "name": name}

    return jsonify({"message": "User registered successfully"}), 201


@app.route('/analyze', methods=['POST'])
def analyze_image_endpoint() -> Tuple[Response, int]:
    """
    Handles image analysis request from the frontend.

    Expects a multipart/form-data request with an 'image' file.
    The image is processed and fed into the loaded Keras model.

    Returns:
        Tuple[Response, int]: A JSON response containing the prediction result,
                              and the HTTP status code.
    """
    if loaded_model is None:
        return jsonify({"error": "AI Model not loaded on the server. Cannot perform analysis."}), 503

    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image_file = request.files['image']

        if image_file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if not allowed_file(image_file.filename):
            return jsonify({"error": "Invalid file type. Only PNG, JPG, and JPEG are allowed."}), 400

        pil_image = Image.open(io.BytesIO(image_file.read()))

        preprocessed_image_array = preprocess_for_model(pil_image)

        prediction_result = run_model_prediction(preprocessed_image_array, loaded_model)

        return jsonify(prediction_result), 200

    except tf.errors.OpError as e:
        print(f"TensorFlow Error during analysis: {e}")
        return jsonify({"error": "Model prediction failed due to an internal error."}), 500
    except IOError:
        return jsonify({"error": "Invalid image file. Please upload a valid image."}), 400
    except Exception as e:
        print(f"Unexpected Error during analysis: {e}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
