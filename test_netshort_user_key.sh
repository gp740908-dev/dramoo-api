#!/bin/bash
KEY="drm_b93dc002511fdb55540f203cf712c1df4456722601ba6b7a"
BASE="http://127.0.0.1:3000/api/netshort"

echo "1. Latest NetShort"
curl -s -H "X-Api-Key: $KEY" "$BASE/latest" | jq -c '.data[0]' || echo "Failed"

echo -e "\n2. Detail/Allepisode"
URL="https://netshort.com/id/episode/kembalinya-phoenix-1903664881032974338"
curl -s -G --data-urlencode "url=$URL" -H "X-Api-Key: $KEY" "$BASE/detail" | jq -c '{title: .data.title, eps: .data.episodes}' || echo "Failed"

echo -e "\n3. Episode Stream"
EP_URL="https://netshort.com/id/episode/kembalinya-phoenix-1903664881032974338"
curl -s -G --data-urlencode "url=$EP_URL" -H "X-Api-Key: $KEY" "$BASE/stream" | jq -c '{success: .success, stream: .data.stream_url}' || echo "Failed"
