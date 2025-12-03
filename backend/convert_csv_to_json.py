#!/usr/bin/env python3
"""
Convert sentiment CSV data to JSON training data
Maps sentiment labels: 'pos' -> 1, 'neg' -> -1, 'neu' -> 0
"""
import csv
import json
from pathlib import Path

def convert_csv_to_json(csv_path: str, json_path: str) -> dict:
    """Convert CSV sentiment data to JSON format"""

    sentiment_map = {
        'pos': 1,
        'neg': -1,
        'neu': 0
    }

    training_data = []
    skipped = 0

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for idx, row in enumerate(reader, start=2):  # start at 2 because of header
                try:
                    text = row.get('Text', '').strip()
                    sentiment_str = row.get('Sentiment', '').strip().lower()

                    if not text or not sentiment_str:
                        skipped += 1
                        continue

                    sentiment_label = sentiment_map.get(sentiment_str)
                    if sentiment_label is None:
                        print(f"Warning: Unknown sentiment '{sentiment_str}' at row {idx}, skipping")
                        skipped += 1
                        continue

                    training_data.append({
                        'text': text,
                        'label': sentiment_label
                    })
                except Exception as e:
                    print(f"Error processing row {idx}: {e}")
                    skipped += 1
                    continue

        # Write to JSON
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)

        stats = {
            'total': len(training_data),
            'positive': sum(1 for d in training_data if d['label'] == 1),
            'negative': sum(1 for d in training_data if d['label'] == -1),
            'neutral': sum(1 for d in training_data if d['label'] == 0),
            'skipped': skipped
        }

        print(f"✓ Conversion complete!")
        print(f"  Total samples: {stats['total']}")
        print(f"  Positive: {stats['positive']}")
        print(f"  Negative: {stats['negative']}")
        print(f"  Neutral: {stats['neutral']}")
        print(f"  Skipped: {stats['skipped']}")

        return stats

    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}")
        raise
    except Exception as e:
        print(f"Error converting CSV: {e}")
        raise

if __name__ == "__main__":
    backend_dir = Path(__file__).parent
    csv_file = backend_dir.parent / "rawdata_sentiment.csv"
    json_file = backend_dir / "training_data.json"

    convert_csv_to_json(str(csv_file), str(json_file))
