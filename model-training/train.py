from ultralytics import YOLO
import torch

def train_model():
    # Check for CUDA availability
    device = '0' if torch.cuda.is_available() else 'cpu'
    if device == 'cpu':
        print("WARNING: CUDA not available. Training will be slow on CPU.")
    else:
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")

    # Load a model
    model = YOLO('yolov8n.pt')  # load a pretrained model (recommended for training)

    # Train the model
    results = model.train(
        data='local_data.yaml',  # path to data.yaml
        epochs=50,
        imgsz=640,
        device=device,
        project='LiveLearnAssist_runs',
        name='handwritten_text_v1'
    )
    
    # Evaluate model performance on the validation set
    metrics = model.val()
    print(metrics.box.map)    # map50-95
    
    # Export the model
    success = model.export(format='onnx')
    print(f"Model exported successfully: {success}")

if __name__ == '__main__':
    train_model()
