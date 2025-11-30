import sys
import argparse
from rembg import remove, new_session

def process():
    # 1. Parse Arguments from Node.js
    parser = argparse.ArgumentParser()
    parser.add_argument('--alpha_matting', action='store_true', help='Enable alpha matting for fine edges')
    args = parser.parse_args()

    try:
        # 2. Load High-Fidelity Model (ISNET)
        # 'isnet-general-use' is significantly better at edges than u2net
        session = new_session("isnet-general-use")

        # 3. Read Binary Input
        input_data = sys.stdin.buffer.read()
        if not input_data:
            raise ValueError("No image data received.")

        # 4. Configure Alpha Matting Settings
        # These settings tune the fine-edge detection
        matting_kwargs = {}
        if args.alpha_matting:
            matting_kwargs = {
                "alpha_matting": True,
                "alpha_matting_foreground_threshold": 240,
                "alpha_matting_background_threshold": 10,
                "alpha_matting_erode_size": 10
            }

        # 5. Execute Removal
        result_data = remove(
            input_data,
            session=session,
            post_process_mask=True, # Smooths binary mask edges
            **matting_kwargs
        )

        # 6. Write Binary Output
        sys.stdout.buffer.write(result_data)
        sys.stdout.flush()

    except Exception as e:
        sys.stderr.write(f"Python Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    process()
