"""Record public operational metadata only; no article text or reader preferences."""
import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = {"news", "technical", "clinical", "tools", "geopolitical"}


def public_url(value):
    if not isinstance(value, str) or len(value) > 8000:
        return None
    try:
        url = urlsplit(value)
        return value if url.scheme in {"http", "https"} and url.hostname and not url.username and not url.password else None
    except (ValueError, OverflowError):
        return None


def iso_date(value):
    if not isinstance(value, str):
        return None
    try:
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return date.astimezone(timezone.utc).isoformat() if date.tzinfo else None
    except ValueError:
        return None


def short_text(value, limit):
    return value[:limit] if isinstance(value, str) else ""


def record_health(report, database):
    if not isinstance(report, dict) or report.get("schemaVersion") != 1 or report.get("status") not in {"pass", "fail"}:
        raise ValueError("Unsupported health report")
    checked_at = iso_date(report.get("checkedAt"))
    base_url = public_url(report.get("baseUrl"))
    if not checked_at or not base_url:
        raise ValueError("Invalid health report identity")
    run_id = report.get("runId")
    if not isinstance(run_id, str) or not re.fullmatch(r"[a-f0-9]{64}", run_id):
        raise ValueError("Invalid health run ID")
    metrics = report.get("metrics") if isinstance(report.get("metrics"), dict) else {}
    clean_metrics = {key: value for key, value in metrics.items() if key in {
        "articleCount", "configuredSources", "healthySources", "healthyRatio", "checkedSources", "deferredSources", "updatedAtAgeSeconds", "servedAtAgeSeconds"
    } and isinstance(value, (int, float)) and not isinstance(value, bool) and abs(value) < 10**12}
    def codes(key):
        values = report.get(key)
        if not isinstance(values, list):
            return []
        return sorted({short_text(item.get("code"), 100) for item in values if isinstance(item, dict) and isinstance(item.get("code"), str)})
    sources = report.get("sources") if isinstance(report.get("sources"), list) else []
    headlines = report.get("headlines") if isinstance(report.get("headlines"), list) else []
    if len(sources) > 5000 or len(headlines) > 10000:
        raise ValueError("Report exceeds ledger limits")
    database = Path(database)
    database.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database, timeout=15) as db:
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS health_runs (
              run_id TEXT PRIMARY KEY, checked_at TEXT NOT NULL, base_url TEXT NOT NULL,
              status TEXT NOT NULL CHECK(status IN ('pass','fail')),
              metrics_json TEXT NOT NULL, error_codes_json TEXT NOT NULL, warning_codes_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS source_checks (
              run_id TEXT NOT NULL REFERENCES health_runs(run_id) ON DELETE CASCADE,
              source_id TEXT NOT NULL, name TEXT NOT NULL, url TEXT,
              kind TEXT NOT NULL, ok INTEGER NOT NULL, deferred INTEGER NOT NULL,
              article_count INTEGER NOT NULL, checked_at TEXT,
              PRIMARY KEY(run_id, source_id)
            );
            CREATE TABLE IF NOT EXISTS headlines (
              url TEXT PRIMARY KEY, article_id TEXT NOT NULL, published_at TEXT NOT NULL,
              category TEXT NOT NULL, source_id TEXT,
              first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS health_run_headlines (
              run_id TEXT NOT NULL REFERENCES health_runs(run_id) ON DELETE CASCADE,
              url TEXT NOT NULL REFERENCES headlines(url), PRIMARY KEY(run_id, url)
            );
        """)
        # The context manager commits this whole run together, or rolls it back.
        db.execute("""INSERT INTO health_runs VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(run_id) DO UPDATE SET checked_at=excluded.checked_at, base_url=excluded.base_url,
            status=excluded.status, metrics_json=excluded.metrics_json, error_codes_json=excluded.error_codes_json,
            warning_codes_json=excluded.warning_codes_json""",
            (run_id, checked_at, base_url, report["status"], json.dumps(clean_metrics, sort_keys=True), json.dumps(codes("errors")), json.dumps(codes("warnings"))))
        db.execute("DELETE FROM source_checks WHERE run_id=?", (run_id,))
        db.execute("DELETE FROM health_run_headlines WHERE run_id=?", (run_id,))
        for source in sources:
            if not isinstance(source, dict) or not short_text(source.get("id"), 200):
                continue
            count = source.get("articleCount", 0)
            count = count if isinstance(count, int) and not isinstance(count, bool) and 0 <= count <= 1000000 else 0
            db.execute("""INSERT OR REPLACE INTO source_checks VALUES (?,?,?,?,?,?,?,?,?)""",
                (run_id, short_text(source.get("id"), 200), short_text(source.get("name"), 200), public_url(source.get("url")),
                 short_text(source.get("kind"), 50), int(source.get("ok") is True), int(source.get("deferred") is True), count, iso_date(source.get("checkedAt"))))
        for article in headlines:
            if not isinstance(article, dict):
                continue
            url, published = public_url(article.get("url")), iso_date(article.get("publishedAt"))
            category = article.get("category")
            if not url or not published or not isinstance(category, str) or category not in CATEGORIES:
                continue
            db.execute("""INSERT INTO headlines VALUES (?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET
                article_id=excluded.article_id, published_at=excluded.published_at, category=excluded.category,
                source_id=excluded.source_id, first_seen_at=MIN(headlines.first_seen_at,excluded.first_seen_at),
                last_seen_at=MAX(headlines.last_seen_at,excluded.last_seen_at)""",
                (url, short_text(article.get("id"), 1000), published, category, short_text(article.get("sourceId"), 200), checked_at, checked_at))
            db.execute("INSERT OR IGNORE INTO health_run_headlines VALUES (?,?)", (run_id, url))
        counts = {"runs": db.execute("SELECT COUNT(*) FROM health_runs").fetchone()[0], "sourceChecks": db.execute("SELECT COUNT(*) FROM source_checks").fetchone()[0], "headlines": db.execute("SELECT COUNT(*) FROM headlines").fetchone()[0]}
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, default=ROOT / ".local/latest-health.json")
    parser.add_argument("--db", type=Path, default=ROOT / ".local/dhivi.sqlite")
    args = parser.parse_args()
    if args.report.stat().st_size > 10_000_000:
        raise ValueError("Health report is too large")
    report = json.loads(args.report.read_text(encoding="utf-8-sig"))
    counts = record_health(report, args.db)
    print(json.dumps({"recorded": True, **counts, "database": str(args.db.resolve())}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, sqlite3.Error):
        raise SystemExit("Could not record health metadata. Check report schema and local file permissions.")
