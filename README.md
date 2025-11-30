# AI Background Remover Actor

A high-performance Apify Actor that removes image backgrounds automatically using the `rembg` library (U2NET model). Designed for speed and integration ease.

## Features
- **High Quality**: Uses state-of-the-art U2NET AI model.
- **Fast I/O**: Streams data between Node.js and Python to avoid disk latency.
- **Flexible Input**: Accepts public URLs or Base64 strings.
- **Persistent Storage**: Saves results to Key-Value store and returns a permanent public link.

## Input Usage
This actor accepts a JSON input.

### Option 1: URL (Recommended)
```json
{
  "imageUrl": "https://example.com/photo.jpg",
  "outputFormat": "png"
}
```

### Option 2: Base64
```json
{
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "outputFormat": "png"
}
```

## Output
The actor pushes a record to the Default Dataset:
```json
{
  "status": "success",
  "originalInput": "https://example.com/photo.jpg",
  "processedImageUrl": "https://api.apify.com/v2/key-value-stores/STORE_ID/records/photo-nobg.png",
  "timestamp": "2023-10-27T10:00:00.000Z"
}
```

## Performance Notes
- **Cold Start**: The first run on a fresh container may take 2-3 seconds longer to initialize Python libraries.
- **Throughput**: For bulk processing, consider running multiple actor instances in parallel via the Apify API.
