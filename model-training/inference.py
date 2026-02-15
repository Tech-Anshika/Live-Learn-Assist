from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import easyocr
import cv2
import numpy as np
import base64
import torch
import io
from PIL import Image
import re

app = FastAPI()

# Load YOLO model
# Using the custom trained model for better handwritten text segmentation
MODEL_PATH = "yolov8n.pt" # "LiveLearnAssist_runs/handwritten_text_v1/weights/best.pt" 
print(f"Loading YOLO model from: {MODEL_PATH}")
try:
    model = YOLO(MODEL_PATH)
except:
    print(f"Warning: Could not load model at {MODEL_PATH}. Using yolov8n.pt instead.")
    model = YOLO("yolov8n.pt")

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available())

@app.get("/")
def read_root():
    return {"status": "Live-Learn Assist Server Running"}

@app.post("/detect")
async def detect_frame(file: UploadFile = File(...)):
    """
    Accepts an image file, runs YOLO detection + EasyOCR, returns bounding boxes and text.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run YOLO inference
    try:
        print("Received request, processing...")
        results = model(img, conf=0.1) # Lower confidence for debugging
        detections = []
    
        for result in results:
            boxes = result.boxes
            print(f"DEBUG: Found {len(boxes)} raw boxes.")
            for box in boxes:
                # Get coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls = box.cls[0].cpu().numpy()
                
                # Crop image for OCR
                cropped_img = img[int(y1):int(y2), int(x1):int(x2)]
                
                # Perform OCR on the cropped region
                try:
                    ocr_result = reader.readtext(cropped_img, detail=0)
                    raw_text = " ".join(ocr_result) if ocr_result else ""
                    
                    # Clean text: remove special chars, keep alphanumeric and basic punctuation
                    text = re.sub(r'[^a-zA-Z0-9\s\.,\?!]', '', raw_text).strip()
                    
                    # Filter out very short garbage text
                    if len(text) < 3:
                        text = ""
                        
                    if text:
                        print(f"DEBUG: Processed Box [{x1:.1f}, {y1:.1f}] Text: '{text}' Conf: {conf:.2f}")
                except Exception as e:
                    print(f"OCR Error: {e}")
                    text = ""
    
                detections.append({
                    "box": [float(x1), float(y1), float(x2), float(y2)],
                    "confidence": float(conf),
                    "class": int(cls),
                    "text": text
                })

        # FALLBACK: If no objects found by YOLO, OCR the WHOLE IMAGE
        if len(detections) == 0:
            print("DEBUG: No YOLO objects found. Running Fallback OCR on full image...")
            try:
                ocr_result = reader.readtext(img, detail=0)
                raw_text = " ".join(ocr_result) if ocr_result else ""
                text = re.sub(r'[^a-zA-Z0-9\s\.,\?!]', '', raw_text).strip()
                
                if len(text) > 3:
                    print(f"DEBUG: Fallback Text Found: '{text}'")
                    # Create a box covering the whole image/middle
                    h, w, _ = img.shape
                    detections.append({
                        "box": [10.0, 10.0, float(w-10), float(h-10)], # Full screen box
                        "confidence": 1.0,
                        "class": 99, # Custom class for fallback
                        "text": text
                    })
            except Exception as e:
                print(f"Fallback OCR Error: {e}")
        
        print(f"Processed frame. Found {len(detections)} objects.")
        return JSONResponse(content={"detections": detections})
        
    except Exception as e:
        print(f"Error processing frame: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    print("Starting server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
