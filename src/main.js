/**
 * Main Node.js Controller
 * Optimized for speed using Stream Buffers
 */
const { Actor } = require('apify');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

// Helper: Run Python script with Buffer input
async function runPythonRemover(imageBuffer) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'remove_bg.py');
        
        // Spawn Python process
        const pythonProcess = spawn('python3', [scriptPath]);
        
        const chunks = [];
        const errorChunks = [];

        // Send image buffer to Python via Standard Input (stdin)
        // This is faster than writing to disk and reading back
        pythonProcess.stdin.write(imageBuffer);
        pythonProcess.stdin.end();

        // Collect output data
        pythonProcess.stdout.on('data', (chunk) => {
            chunks.push(chunk);
        });

        // Collect error messages
        pythonProcess.stderr.on('data', (chunk) => {
            errorChunks.push(chunk);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                const errorMsg = Buffer.concat(errorChunks).toString();
                reject(new Error(`Python process exited with code ${code}: ${errorMsg}`));
            } else {
                resolve(Buffer.concat(chunks));
            }
        });
    });
}

Actor.main(async () => {
    // 1. Get Input
    const input = await Actor.getInput();
    const { imageUrl, imageBase64, outputFormat = 'png' } = input;

    if (!imageUrl && !imageBase64) {
        await Actor.fail('Validation Error: You must provide either "imageUrl" or "imageBase64".');
    }

    try {
        let imageBuffer;
        let filename;

        // 2. Prepare Image Data (Memory Safe)
        console.log('🖼️  Loading image...');
        if (imageUrl) {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data);
            // Extract filename from URL or generate random
            filename = path.basename(imageUrl).split('?')[0] || `image-${Date.now()}`;
        } else {
            imageBuffer = Buffer.from(imageBase64, 'base64');
            filename = `upload-${Date.now()}`;
        }

        // Clean filename extension
        filename = filename.replace(/\.[^/.]+$/, "");

        // 3. Process with Python (rembg)
        console.log('🚀 Processing background removal via Python...');
        const processedBuffer = await runPythonRemover(imageBuffer);

        // 4. Save Output to Apify Key-Value Store
        console.log('💾 Saving result...');
        const outputKey = `${filename}-nobg.${outputFormat}`;
        const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/png';

        await Actor.setValue(outputKey, processedBuffer, { contentType: mimeType });

        // Generate public URL for the stored image
        const storeId = Actor.getEnv().defaultKeyValueStoreId;
        const publicUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${outputKey}`;

        // 5. Output Results to Dataset
        console.log(`✅ Success! Image saved to: ${publicUrl}`);
        
        await Actor.pushData({
            status: "success",
            originalInput: imageUrl ? imageUrl : "base64-input",
            processedImageUrl: publicUrl,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ processing failed:', error);
        await Actor.pushData({
            status: "error",
            error: error.message
        });
        throw error;
    }
});
