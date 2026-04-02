import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image
import os
import io

# Required slots
SLOTS = ["Front View", "Rear View", "Left Side", "Right Side", "VIN / Chassis", "Odometer"]

class CarPDFApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Car Image PDF Tool")
        self.root.geometry("400x300")
        self.images = [None] * 6
        
        tk.Label(root, text="Car Image PDF Compressor", font=("Arial", 14, "bold")).pack(pady=10)
        
        self.btn_select = tk.Button(root, text="1. Select 6 Images", command=self.select_images, width=20)
        self.btn_select.pack(pady=10)
        
        self.btn_create = tk.Button(root, text="2. Create PDF", command=self.create_pdf, state=tk.DISABLED, width=20)
        self.btn_create.pack(pady=10)
        
        self.status = tk.Label(root, text="Please select 6 images to start.", fg="gray")
        self.status.pack(pady=10)

    def select_images(self):
        files = filedialog.askopenfilenames(
            title="Select exactly 6 images",
            filetypes=[("Image files", "*.jpg *.jpeg *.png")]
        )
        if len(files) != 6:
            messagebox.showerror("Error", f"Please select exactly 6 images. You selected {len(files)}.")
            return
        
        self.images = list(files)
        self.btn_create.config(state=tk.NORMAL)
        self.status.config(text="6 images selected. Ready to create PDF.", fg="green")

    def create_pdf(self):
        try:
            quality = 85
            output_path = "car_images.pdf"
            
            while quality >= 45:
                pdf_bytes = io.BytesIO()
                processed_images = []
                
                for img_path in self.images:
                    img = Image.open(img_path).convert("RGB")
                    # Resize max width 1200px
                    if img.width > 1200:
                        ratio = 1200 / float(img.width)
                        new_height = int(float(img.height) * ratio)
                        img = img.resize((1200, new_height), Image.Resampling.LANCZOS)
                    processed_images.append(img)
                
                # Save to PDF
                processed_images[0].save(
                    output_path, 
                    save_all=True, 
                    append_images=processed_images[1:], 
                    quality=quality, 
                    optimize=True
                )
                
                size_mb = os.path.getsize(output_path) / (1024 * 1024)
                if size_mb < 2.0 or quality == 45:
                    messagebox.showinfo("Success", f"PDF created successfully!\nFile: {output_path}\nSize: {size_mb:.2f} MB")
                    break
                
                quality -= 10
                
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = CarPDFApp(root)
    root.mainloop()
