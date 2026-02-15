import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BoundingBox = ({ box, text, confidence, imageWidth, imageHeight }) => {
    // Box coordinates are usually normalized or pixel-based relative to the image sent.
    // Assuming the API returns [x1, y1, x2, y2] in pixel coordinates of the processed image (e.g. 640x480).
    // We need to scale these to the screen size if the camera preview size differs.
    // For MVP, we'll rely on Flexbox scaling or assume the camera preview matches the capture aspect ratio.

    // Here we assume box is [x1, y1, x2, y2] relative to the view.
    // If the server returns raw coordinates from the full resolution image, we need scaling factors.

    const [x1, y1, x2, y2] = box;
    const width = x2 - x1;
    const height = y2 - y1;

    return (
        <View
            style={[
                styles.box,
                {
                    left: x1,
                    top: y1,
                    width: width,
                    height: height,
                },
            ]}
        >
            <View style={styles.labelContainer}>
                <Text style={styles.labelText}>
                    {text} ({Math.round(confidence * 100)}%)
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    box: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#00FF00', // High contrast green
        backgroundColor: 'rgba(0, 255, 0, 0.1)', // Slight tint
        zIndex: 10,
    },
    labelContainer: {
        position: 'absolute',
        top: -25, // Above the box
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark background for readability
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    labelText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Roboto', // Use a clean, sans-serif font (system default usually fine)
        // For dyslexia: avoid serifs, ensure high contrast.
    },
});

export default BoundingBox;
