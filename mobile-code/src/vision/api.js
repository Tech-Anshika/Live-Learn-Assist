import axios from 'axios';

/**
 * Sends an image to the backend for YOLO + OCR processing.
 * @param {string} photoUri - URI of the captured image.
 * @param {string} serverUrl - Base URL of the Python backend (e.g., http://192.x.x.x:8000).
 * @returns {Promise<Array>} List of detections [{box, text, confidence, class}].
 */
export const detectText = async (photoUri, serverUrl) => {
    const formData = new FormData();
    formData.append('file', {
        uri: photoUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    });

    try {
        const response = await axios.post(`${serverUrl}/detect`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 5000, // 5s timeout
        });

        if (response.data && response.data.detections) {
            return response.data.detections;
        }
        return [];
    } catch (error) {
        console.warn("Detection API Error:", error.message);
        return [];
    }
};
