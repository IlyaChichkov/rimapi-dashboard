// src/utils/iconProcessor.ts

interface FactionIconData {
    image: {
        image_base64: string;
    };
    color: string; // "RGBA(0.415, 0.659, 0.979, 1.000)"
}

export const processFactionIcon = async (data: FactionIconData): Promise<string | null> => {
    try {
        // 1. Parse RGBA string
        const colorMatch = data.color.match(/[\d.]+/g);
        if (!colorMatch) return null;
        const [tr, tg, tb, ta] = colorMatch.map(Number);

        // 2. Load Base64 into Image
        const img = new Image();
        img.src = `data:image/png;base64,${data.image.image_base64}`;
        
        await img.decode();

        // 3. Setup Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = img.width;
        canvas.height = img.height;

        // 4. Draw & Get Pixels
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // 5. Apply Multiplicative Tint
        for (let i = 0; i < pixels.length; i += 4) {
            // Only tint if pixel has opacity
            if (pixels[i+3] > 0) {
                pixels[i]     = pixels[i]     * tr; 
                pixels[i + 1] = pixels[i + 1] * tg; 
                pixels[i + 2] = pixels[i + 2] * tb; 
                pixels[i + 3] = pixels[i + 3] * ta; 
            }
        }

        // 6. Output
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    } catch (error) {
        console.error("Error processing faction icon:", error);
        return null;
    }
};