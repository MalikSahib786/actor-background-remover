import sys
import os
import argparse

# Helper to log to stderr immediately
def log(msg):
    sys.stderr.write(f"DEBUG: {msg}\n")
    sys.stderr.flush()

try:
    log("Importing libraries...")
    from rembg import remove, new_session
    import io
    log("Libraries imported.")

    def process():
        parser = argparse.ArgumentParser()
        parser.add_argument('--alpha_matting', action='store_true')
        args = parser.parse_args()

        # Check where we think the model is
        model_home = os.environ.get('U2NET_HOME', 'Not Set')
        log(f"U2NET_HOME is set to: {model_home}")

        log("Loading Model Session (isnet-general-use)...")
        # This is usually where it crashes if OOM
        session = new_session("isnet-general-use")
        log("Model Loaded Successfully.")

        log("Reading input from stdin...")
        input_data = sys.stdin.buffer.read()
        
        if not input_data:
            raise ValueError("No input data received.")
        
        log(f"Input received: {len(input_data)} bytes. Processing...")

        matting_kwargs = {}
        if args.alpha_matting:
            log("Alpha Matting ENABLED (High Quality)")
            matting_kwargs = {
                "alpha_matting": True,
                "alpha_matting_foreground_threshold": 240,
                "alpha_matting_background_threshold": 10,
                "alpha_matting_erode_size": 10
            }

        result_data = remove(
            input_data,
            session=session,
            post_process_mask=True,
            **matting_kwargs
        )

        log("Processing done. Writing output...")
        sys.stdout.buffer.write(result_data)
        sys.stdout.flush()
        log("Done.")

    if __name__ == "__main__":
        process()

except Exception as e:
    sys.stderr.write(f"PYTHON CRASH: {str(e)}\n")
    sys.exit(1)
