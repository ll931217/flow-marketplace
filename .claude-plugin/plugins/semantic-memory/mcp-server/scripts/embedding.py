#!/usr/bin/env python3
"""
Embedding generation script for Semantic Memory MCP Server
"""

import sys
import json


def generate_embeddings(texts, model_name="all-MiniLM-L6-v2"):
    """Generate embeddings using sentence-transformers"""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print(
            json.dumps({
                "error": "sentence-transformers not installed. "
                "Install with: pip install sentence-transformers"
            }),
            file=sys.stderr,
        )
        sys.exit(1)

    model = SentenceTransformer(model_name)
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return {
        "embeddings": embeddings.tolist(),
        "model": model_name,
        "dimension": int(embeddings.shape[1]) if len(embeddings.shape) > 1 else len(embeddings),
    }


def main():
    model_name = sys.argv[1] if len(sys.argv) > 1 else "all-MiniLM-L6-v2"

    try:
        input_data = json.loads(sys.stdin.read())
        texts = input_data.get("texts", [])
    except (json.JSONDecodeError, KeyError):
        print(json.dumps({"error": "Invalid input. Expected JSON with 'texts' array."}), file=sys.stderr)
        sys.exit(1)

    if not texts:
        print(json.dumps({"error": "No texts provided"}), file=sys.stderr)
        sys.exit(1)

    result = generate_embeddings(texts, model_name)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
