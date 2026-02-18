
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

print("Attempting to import app.main...")
try:
    # We need to mock credentials/db if main connects on import?
    # main.py connects to DB in startup event, but defines models at global scope.
    # It imports database, models.
    import main
    print("Successfully imported main.")
except Exception as e:
    print(f"Failed to import main: {e}")
    import traceback
    traceback.print_exc()
