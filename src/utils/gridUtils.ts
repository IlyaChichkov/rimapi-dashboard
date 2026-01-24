// src/utils/gridUtils.ts

/**
 * Decodes Base64 RLE Fog Data into a Uint8Array (0 = Revealed, 1 = Fogged).
 * Format: 32-bit integers representing alternating counts of Revealed/Fogged cells.
 */
export const decodeFogGrid = (base64Str: string, totalCells: number): Uint8Array => {
    // 1. Base64 to Binary
    const binaryString = atob(base64Str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Binary to Int32Array (Little Endian usually)
    const int32View = new Int32Array(bytes.buffer);
    
    // 3. Expand RLE to Grid
    const grid = new Uint8Array(totalCells);
    let cursor = 0;
    let isFogged = false; // Starts with Revealed (False)

    for (let i = 0; i < int32View.length; i++) {
        const count = int32View[i];
        
        // Fill 'count' cells
        if (isFogged) {
            // Optimization: Only fill if 1 (Fogged), since array inits to 0 (Revealed)
            grid.fill(1, cursor, cursor + count);
        }
        
        cursor += count;
        isFogged = !isFogged; // Toggle state
    }

    return grid;
};