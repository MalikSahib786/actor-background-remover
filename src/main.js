const { Actor } = require('apify');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

async function runPythonRemover(imageBuffer, options) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'remove_bg.py');
        
        // Pass arguments to Python script
        const args = [scriptPath];
        if (options.enableAlphaMatting) {
            args.push('--alpha_matting');
        }

        const pythonProcess = spawn('python3', args);
        
        const chunks = [];
        const errorChunks = [];

        // Pipe image data (fastest method)
        pythonProcess.stdin.write(imageBuffer);
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (chunk) => chunks.push(chunk));
        pythonProcess.stderr.on('data', (chunk) => errorChunks.push(chunk));

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                const errorMsg = Buffer.concat(errorChunks).toString();
                reject(new Error(`Python Error (Code ${code}): ${errorMsg}`));
            } else {
                resolve(Buffer.concat(chunks));
            }
        });
    });
}

Actor.main(async () => {
    const input = await Actor.getInput();
    // Default to true for quality if not provided
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
        console.log('🖼️  Downloading/Decoding image...');
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
        
        filename = filename.replace(/\.[^/.]+$/, ""); // strip extension

        console.log(`🚀 Processing with AI (Model: ISNET, Matting: ${enableAlphaMatting})...`);
        
        const processedBuffer = await runPythonRemover(imageBuffer, { enableAlphaMatting });

        console.log('💾 Uploading result...');
        const outputKey = `${filename}-nobg.${outputFormat}`;
        const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/png';

        await Actor.setValue(outputKey, processedBuffer, { contentType: mimeType });

        const storeId = Actor.getEnv().defaultKeyValueStoreId;
        const publicUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${outputKey}`;

        console.log(`✅ Finished: ${publicUrl}`);
        
        await Actor.pushData({
            status: "success",
            originalInput: imageUrl || "base64",
            processedImageUrl: publicUrl,
            settings: { model: "isnet-general-use", alphaMatting: enableAlphaMatting }
        });

    } catch (error) {
        console.error('❌ Failed:', error.message);
        await Actor.fail(error.message);
    }
});
