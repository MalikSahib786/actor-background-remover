import sys
import io
from rembg import remove, new_session
from PIL import Image

def process_image():
    """
    Reads binary image data from stdin, removes background,
    and writes binary png data to stdout.
    """
    try:
        # Initialize session with u2net (general purpose, balanced speed/quality)
        # Session caching helps if we extended this to a server loop,
        # but prevents model reload overhead logic within the library.
        session = new_session("u2net")

        # 1. Read all bytes from Standard Input
        input_data = sys.stdin.buffer.read()

        if not input_data:
            raise ValueError("No input data received in Python script")

        # 2. Process image
        # rembg.remove takes bytes and returns bytes
        result_data = remove(
            input_data, 
            session=session,
            alpha_matting=False # Set True only for fine hair details (slower)
        )

        # 3. Write result to Standard Output
        sys.stdout.buffer.write(result_data)
        sys.stdout.flush()

    except Exception as e:
        # Write error to stderr so Node.js can catch it
        sys.stderr.write(f"Error in Python Script: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    process_image()
