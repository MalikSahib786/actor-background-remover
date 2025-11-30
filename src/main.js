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
        
        // Pipe image to Python stdin
        pythonProcess.stdin.write(imageBuffer);
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (chunk) => chunks.push(chunk));

        // 🚨 CRITICAL FIX: Stream stderr directly to console so we see errors immediately
        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Python Log]: ${data.toString()}`);
        });

        // Handle process exit
        pythonProcess.on('close', (code, signal) => {
            if (code === 0) {
                resolve(Buffer.concat(chunks));
            } else {
                // Determine if it was a crash (Signal) or Error (Code)
                const failureReason = code !== null 
                    ? `Exit Code ${code}` 
                    : `Killed by Signal ${signal} (Likely Out of Memory)`;
                
                reject(new Error(`Python processing failed: ${failureReason}`));
            }
        });

        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to spawn Python process: ${err.message}`));
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
        
        // Run AI
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
