from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import numpy as np
import io
import os
import cv2 # For OpenCV operations
import tensorflow as tf # For loading and using the Keras model
import random # Add this import

app = Flask(__name__, static_folder='frontend')
CORS(app)

# --- Model Loading ---
MODEL_LOAD_PATH = 'effnet.h5' # Make sure this file is in the same directory or provide the correct path
loaded_model = None

# Import functions from utils.py
from utils import preprocess_for_model, run_model_prediction

try:
    if os.path.exists(MODEL_LOAD_PATH):
        loaded_model = tf.keras.models.load_model(MODEL_LOAD_PATH)
        print(f"Model '{MODEL_LOAD_PATH}' loaded successfully.")
    else:
        print(f"Error: Model file not found at '{MODEL_LOAD_PATH}'. The /analyze endpoint will not work.")
except Exception as e:
    print(f"Error loading Keras model: {e}")
    # loaded_model will remain None, and we can check for this in the analyze route

# Dummy user database (replace with a real database in production)
users = {
    "test@example.com": {"password": "password", "name": "Test User"}
}

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/login', methods=['POST'])
def login():
    """Handles user login."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users.get(email) # Get user data

    if user and user['password'] == password: # Check if user exists and password matches
        # Generate a dummy session token
        session_token = f"dummy_token_for_{email.split('@')[0]}_{random.randint(10000, 99999)}"
        user_name = user.get('name', 'User') # Get user's name, default to 'User'
        return jsonify({
            'message': 'Login successful',
            'session_token': session_token,
            'user_name': user_name
        }), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({"message": "Missing email, password, or name"}), 400

    # Basic type validation
    if not isinstance(email, str) or not isinstance(password, str) or not isinstance(name, str):
        return jsonify({"message": "Email, password, and name must be strings"}), 400

    if len(password) < 6: # Basic password length check
        return jsonify({"message": "Password must be at least 6 characters long"}), 400

    if email in users:
        return jsonify({"message": "Email already registered"}), 409 # Conflict

    # In a real app, hash the password before storing:
    # from werkzeug.security import generate_password_hash
    # users[email] = {"password": generate_password_hash(password), "name": name}
    users[email] = {"password": password, "name": name}

    return jsonify({"message": "User registered successfully"}), 201

@app.route('/analyze', methods=['POST'])
def analyze_image_endpoint(): # Renamed to avoid conflict with PIL.Image
    """
    Handles image analysis request from the frontend.
    Returns:
        json: the analysis result.
    """
    if loaded_model is None:
        return jsonify({"error": "AI Model not loaded on the server. Cannot perform analysis."}), 503 # Service Unavailable

    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image_file = request.files['image']

        # Open the image using Pillow
        pil_image = Image.open(io.BytesIO(image_file.read()))

        # Preprocess image for the model
        preprocessed_image_array = preprocess_for_model(pil_image)

        # Run prediction
        prediction_result = run_model_prediction(preprocessed_image_array, loaded_model) # Pass loaded_model

        return jsonify(prediction_result), 200 # prediction_result is already a dict

    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({"error": f"An error occurred during analysis: {str(e)}"}), 500

if __name__ == '__main__':
    # Make sure 'effnet.h5' is in the same directory as this script,
    # or update MODEL_LOAD_PATH.
    app.run(debug=True, host='0.0.0.0', port=5002)