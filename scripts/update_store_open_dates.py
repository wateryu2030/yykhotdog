#!/usr/bin/env python3
"""Sync store opening dates from cyrg2025/cyrgweixin Shop tables into hotdog2030.stores.open_date."""
import logging
from datetime import datetime
from typing import Dict, Optional

import pymssql

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'user': 'hotdog',
    'password': 'Zhkj@62102218',
}

SOURCE_QUERIES = {
    'cyrg2025': """
        SELECT 
            Id AS store_id,
            ShopName AS store_name,
            CASE WHEN ISDATE(openingTime) = 1 THEN CAST(openingTime AS datetime) ELSE NULL END AS opening_time,
            CASE WHEN ISDATE(establishTime) = 1 THEN CAST(establishTime AS datetime) ELSE NULL END AS establish_time,
            CASE WHEN ISDATE(RecordTime) = 1 THEN CAST(RecordTime AS datetime) ELSE NULL END AS record_time
        FROM Shop WITH (NOLOCK)
        WHERE delflag = 0
    """,
    'cyrgweixin': None,  # 没有 openingTime 字段，暂时跳过
}


def get_conn(db: str) -> pymssql.Connection:
    return pymssql.connect(server=CONFIG['server'], port=CONFIG['port'], user=CONFIG['user'], password=CONFIG['password'], database=db)


def fetch_open_dates(database: str, query: str) -> Dict[int, datetime]:
    logging.info('Fetching shop opening info from %s ...', database)
    conn = get_conn(database)
    cursor = conn.cursor(as_dict=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    mapping: Dict[int, datetime] = {}
    for row in rows:
        store_id = row['store_id']
        candidates = [row.get('opening_time'), row.get('establish_time'), row.get('record_time')]
        open_date: Optional[datetime] = next((dt for dt in candidates if dt), None)
        if not open_date:
            continue
        if store_id not in mapping or open_date < mapping[store_id]:
            mapping[store_id] = open_date
    logging.info('  %s rows with valid open dates', len(mapping))
    return mapping


def update_hotdog(open_dates: Dict[int, datetime]):
    if not open_dates:
        logging.warning('No open dates to update.')
        return
    conn = get_conn('hotdog2030')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM stores WITH (NOLOCK)')
    existing_ids = {row[0] for row in cursor.fetchall()}

    updates = []
    missing = []
    for store_id, open_date in open_dates.items():
        if store_id in existing_ids:
            updates.append((open_date, store_id))
        else:
            missing.append(store_id)

    logging.info('Updating %s stores with open_date ...', len(updates))
    if updates:
        cursor.executemany('UPDATE stores SET open_date=%s WHERE id=%s', updates)
        conn.commit()
    if missing:
        logging.warning('No matching store IDs in hotdog2030 for %s entries (showing first 10): %s', len(missing), missing[:10])
    conn.close()


def main():
    merged: Dict[int, datetime] = {}
    for db, query in SOURCE_QUERIES.items():
        if not query:
            logging.info('Skipping %s (no openingTime data).', db)
            continue
        data = fetch_open_dates(db, query)
        for store_id, open_date in data.items():
            if store_id not in merged or open_date < merged[store_id]:
                merged[store_id] = open_date
    logging.info('Merged %s store open dates from sources.', len(merged))
    update_hotdog(merged)
    logging.info('Done.')


if __name__ == '__main__':
    main()
