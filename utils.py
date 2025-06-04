import numpy as np
import cv2 # For OpenCV operations
import tensorflow as tf # For loading and using the Keras model

# Make sure this is defined or passed if your model is loaded here.
# For now, assuming it's passed or handled by the caller.
# loaded_model = None

def preprocess_for_model(pil_img):
    """
    Preprocesses the PIL image for the effnet.h5 model.
    Args:
        pil_img (PIL.Image): The input image.
    Returns:
        numpy.ndarray: The preprocessed image array.
    """
    # Convert PIL Image to NumPy array
    img_array = np.array(pil_img)

    # If the image is RGBA or Grayscale, convert to RGB
    if img_array.ndim == 2: # Grayscale
        img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
    elif img_array.shape[2] == 4: # RGBA
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

    # Convert RGB (from PIL) to BGR (for OpenCV and potentially the model)
    opencv_image_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

    # Resize to model's expected input size
    img_resized = cv2.resize(opencv_image_bgr, (150, 150))

    # Reshape for the model: (batch_size, height, width, channels)
    img_reshaped = img_resized.reshape(1, 150, 150, 3)

    # Normalization: The original Jupyter code doesn't show explicit normalization (e.g. /255.0)
    # before model.predict(). If your 'effnet.h5' model was trained on pixel values
    # in the range [0, 255], then no normalization is needed here.
    # If it was trained on [0, 1] or [-1, 1], you'd add:
    # img_reshaped = img_reshaped / 255.0  # For [0,1]
    # Or use tf.keras.applications.efficientnet.preprocess_input if it's a standard EfficientNet

    return img_reshaped

def run_model_prediction(image_array, loaded_model): # Added loaded_model as an argument
    """
    Runs prediction using the loaded Keras model and maps output to labels.
    Args:
        image_array (numpy.ndarray): The preprocessed image array.
        loaded_model (tf.keras.Model): The loaded Keras model.
    Returns:
        dict: A dictionary containing the prediction label and class.
    """
    if loaded_model is None:
        raise RuntimeError("Model is not loaded.")

    prediction_probabilities = loaded_model.predict(image_array)
    predicted_class_index = np.argmax(prediction_probabilities, axis=1)[0]

    prediction_label = ""
    has_tumor = False # Default, will be overridden if a tumor is detected

    if predicted_class_index == 0:
        prediction_label = 'Glioma Tumor'
        has_tumor = True
    elif predicted_class_index == 1:
        prediction_label = 'No Tumor' # This means no tumor detected by the model
        has_tumor = False
    elif predicted_class_index == 2:
        prediction_label = 'Meningioma Tumor'
        has_tumor = True
    else: # Assuming class 3 for 'Pituitary Tumor'
        prediction_label = 'Pituitary Tumor'
        has_tumor = True

    return {
        "predicted_class_index": int(predicted_class_index), # Send as int
        "prediction_label": prediction_label,
        "has_tumor": has_tumor,
        "message": f"The model predicts: {prediction_label}" # A more direct message
    }
