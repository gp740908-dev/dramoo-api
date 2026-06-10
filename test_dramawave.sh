#!/bin/bash
API_URL="http://127.0.0.1:3000/api"
API_KEY="drm_b93dc002511fdb55540f203cf712c1df4456722601ba6b7a"

echo "1. Latest DramaWave"
LATEST=$(curl -s -H "X-Api-Key: $API_KEY" "$API_URL/dramawave/latest")
echo $LATEST | jq -c '.data[0]'

URL=$(echo $LATEST | jq -r '.data[0].url')

echo -e "\n2. Detail/Allepisode"
DETAIL=$(curl -s -H "X-Api-Key: $API_KEY" "$API_URL/dramawave/detail?url=$URL")
echo $DETAIL | jq -c '{title: .data.title, eps: .data.episodes[:1]}'

EPS_URL=$(echo $DETAIL | jq -r '.data.episodes[0].url')

echo -e "\n3. Episode Stream"
curl -s -H "X-Api-Key: $API_KEY" "$API_URL/dramawave/stream?url=$EPS_URL" | jq -c '{success: .success, stream: .data.stream}'
