from typing import Any, Dict

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image


def preprocess_for_model(pil_img: Image.Image) -> np.ndarray:
    """
    Preprocesses the PIL image for the effnet.h5 model.

    This function converts the PIL image to a NumPy array, handles channel conversions
    (Grayscale/RGBA to RGB), converts RGB to BGR (for OpenCV compatibility if needed),
    resizes the image to 150x150, and reshapes it to (1, 150, 150, 3).

    Args:
        pil_img (PIL.Image.Image): The input image loaded via PIL.

    Returns:
        numpy.ndarray: The preprocessed image array ready for model prediction.
    """
    # Convert PIL Image to NumPy array
    img_array = np.array(pil_img)

    # If the image is RGBA or Grayscale, convert to RGB
    if img_array.ndim == 2:  # Grayscale
        img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
    elif img_array.shape[2] == 4:  # RGBA
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

    # Convert RGB (from PIL) to BGR (for OpenCV and potentially the model)
    opencv_image_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

    # Resize to model's expected input size
    img_resized = cv2.resize(opencv_image_bgr, (150, 150))

    # Reshape for the model: (batch_size, height, width, channels)
    img_reshaped = img_resized.reshape(1, 150, 150, 3)

    return img_reshaped


def run_model_prediction(image_array: np.ndarray, loaded_model: tf.keras.Model) -> Dict[str, Any]:
    """
    Runs prediction using the loaded Keras model and maps output to labels.

    Args:
        image_array (numpy.ndarray): The preprocessed image array.
        loaded_model (tf.keras.Model): The loaded Keras model.

    Returns:
        Dict[str, Any]: A dictionary containing the prediction label, class index,
                        tumor detection status, and a message.

    Raises:
        RuntimeError: If the loaded_model is None.
    """
    if loaded_model is None:
        raise RuntimeError("Model is not loaded.")

    prediction_probabilities = loaded_model.predict(image_array)
    predicted_class_index = np.argmax(prediction_probabilities, axis=1)[0]

    # Calculate confidence score (max probability)
    confidence_score = float(np.max(prediction_probabilities))

    prediction_label = ""
    has_tumor = False

    if predicted_class_index == 0:
        prediction_label = 'Glioma Tumor'
        has_tumor = True
    elif predicted_class_index == 1:
        prediction_label = 'No Tumor'
        has_tumor = False
    elif predicted_class_index == 2:
        prediction_label = 'Meningioma Tumor'
        has_tumor = True
    else:  # Assuming class 3 for 'Pituitary Tumor'
        prediction_label = 'Pituitary Tumor'
        has_tumor = True

    return {
        "predicted_class_index": int(predicted_class_index),
        "prediction_label": prediction_label,
        "confidence_score": confidence_score,
        "has_tumor": has_tumor,
        "message": f"The model predicts: {prediction_label}"
    }
