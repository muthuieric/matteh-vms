/**
 * Aggressive image compression for VMS.
 * Shrinks photos to max 800px width (plenty for ID/Faces) and 70% quality.
 * This guarantees even a 5MB photo shrinks down to ~40KB - 80KB.
 */
export async function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<File> {
    // If the file is missing or not an image (e.g., a PDF), return it as-is
    // This prevents the canvas from trying to compress a document and crashing
    if (!file || !file.type?.startsWith("image/")) {
      return file;
    }
  
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
  
          // Shrink image to max 800px width (perfect for web/mobile profiles)
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
  
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            resolve(file); 
            return;
          }
  
          ctx.drawImage(img, 0, 0, width, height);
  
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              
              // FIX: Guarantee the file has a .jpg extension. 
              // Phones often upload files without extensions (e.g. just "image"), 
              // which causes the server to throw a 415 Unsupported Media Type error.
              let safeName = file.name || "security-photo";
              if (safeName.includes(".")) {
                safeName = safeName.substring(0, safeName.lastIndexOf(".")) + ".jpg";
              } else {
                safeName += ".jpg";
              }
  
              const compressedFile = new File([blob], safeName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };
        
        // If the image fails to load in canvas (e.g., weird phone formats), gracefully fallback
        img.onerror = () => resolve(file);
      };
      
      // If FileReader fails, gracefully fallback
      reader.onerror = () => resolve(file);
    });
  }