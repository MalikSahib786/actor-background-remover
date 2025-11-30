const { Actor } = require('apify');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

async function runPythonRemover(imageBuffer, options) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'remove_bg.py');
        
        const args = [scriptPath];
        if (options.enableAlphaMatting) {
            args.push('--alpha_matting');
        }

        const pythonProcess = spawn('python3', args);
        
        const chunks = [];
        
        // --- 🚨 FIX: Handle write errors (EPIPE) on stdin ---
        pythonProcess.stdin.on('error', (err) => {
            // If the pipe breaks, it usually means Python died. 
            // We ignore this specific error here because the 'close' handler 
            // below will catch the non-zero exit code and reject the promise with a better message.
            if (err.code === 'EPIPE') return;
            reject(new Error(`Stdin Error: ${err.message}`));
        });

        // Write data safely
        try {
            pythonProcess.stdin.write(imageBuffer);
            pythonProcess.stdin.end();
        } catch (e) {
            // Catch synchronous write errors
            console.error("Failed to write to Python process:", e);
        }

        pythonProcess.stdout.on('data', (chunk) => chunks.push(chunk));

        // Stream Python logs directly to console for debugging
        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Python]: ${data.toString().trim()}`);
        });

        pythonProcess.on('close', (code, signal) => {
            if (code === 0) {
                resolve(Buffer.concat(chunks));
            } else {
                const failureReason = code !== null 
                    ? `Exit Code ${code}` 
                    : `Killed by Signal ${signal} (RAM Limit Exceeded)`;
                
                reject(new Error(`Python Worker Failed: ${failureReason}`));
            }
        });

        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to spawn Python: ${err.message}`));
        });
    });
}

Actor.main(async () => {
    const input = await Actor.getInput();
    const { 
        imageUrl, 
        imageBase64, 
        outputFormat = 'png', 
        enableAlphaMatting = true 
    } = input;

    if (!imageUrl && !imageBase64) {
        await Actor.fail('Error: Please provide imageUrl or imageBase64');
    }

    try {
        console.log('🖼️  Downloading image...');
        let imageBuffer;
        let filename;

        if (imageUrl) {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data);
            filename = path.basename(imageUrl).split('?')[0] || `img-${Date.now()}`;
        } else {
            imageBuffer = Buffer.from(imageBase64, 'base64');
            filename = `upload-${Date.now()}`;
        }
        
        filename = filename.replace(/\.[^/.]+$/, "");

        console.log(`🚀 Processing (Model: ISNET, Matting: ${enableAlphaMatting})...`);
        
        const processedBuffer = await runPythonRemover(imageBuffer, { enableAlphaMatting });

        console.log('💾 Uploading result...');
        const outputKey = `${filename}-nobg.${outputFormat}`;
        const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/png';

        await Actor.setValue(outputKey, processedBuffer, { contentType: mimeType });

        const storeId = Actor.getEnv().defaultKeyValueStoreId;
        const publicUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${outputKey}`;

        console.log(`✅ Success: ${publicUrl}`);
        
        await Actor.pushData({
            status: "success",
            processedImageUrl: publicUrl,
            settings: { model: "isnet-general-use", alphaMatting: enableAlphaMatting }
        });

    } catch (error) {
        console.error('❌ FATAL ERROR:', error.message);
        await Actor.fail(error.message);
    }
});
