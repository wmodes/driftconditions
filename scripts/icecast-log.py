#!/usr/bin/env python3  

import re
from datetime import datetime

log_file = '/var/log/icecast2/access.log'

connection_re = re.compile(r'\[(.*?)\] .* listener count (.*?)\b')
listener_counts = []

with open(log_file, 'r') as file:
    for line in file:
        match = connection_re.search(line)
        if match:
            timestamp = datetime.strptime(match.group(1), '%Y-%m-%d %H:%M:%S')
            listener_count = int(match.group(2))
            listener_counts.append((timestamp, listener_count))

if listener_counts:
    peak_usage = max(listener_counts, key=lambda x: x[1])
    print(f"Peak usage: {peak_usage[1]} listeners at {peak_usage[0]}")
else:
    print("No listener data found in the logs.")
