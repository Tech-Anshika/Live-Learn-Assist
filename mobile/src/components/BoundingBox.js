import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BoundingBox = ({ box, text, confidence, imageWidth, imageHeight }) => {
    // Coordinates [x1, y1, x2, y2]
    const [x1, y1, x2, y2] = box;
    const width = x2 - x1;
    const height = y2 - y1;

    // Use yellow/black for high contrast accessibility
    const theme = {
        border: '#FFFF00', // Yellow
        bg: 'rgba(255, 255, 0, 0.1)',
        labelBg: '#000000',
        labelText: '#FFFF00',
        fontFamily: 'Roboto', // Keep sans-serif
    };

    return (
        <View
            style={[
                styles.box,
                {
                    left: x1,
                    top: y1,
                    width: width,
                    height: height,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                },
            ]}
        >
            <View style={[styles.labelContainer, { backgroundColor: theme.labelBg }]}>
                <Text style={[styles.labelText, { color: theme.labelText, fontFamily: theme.fontFamily }]}>
                    {text}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    box: {
        position: 'absolute',
        borderWidth: 3, // Thicker border for visibility
        zIndex: 10,
    },
    labelContainer: {
        position: 'absolute',
        top: -30, // Higher above box
        left: -2, // Aligned with border
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 4,
        minWidth: 50,
    },
    labelText: {
        fontSize: 18, // Larger font
        fontWeight: 'bold',
        letterSpacing: 1, // Better readability
    },
});

export default BoundingBox;
