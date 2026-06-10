#!/bin/bash
KEY="dr_test_1234567890"
BASE="http://127.0.0.1:3000/api/dramabox"

echo "1. Latest DramaBox"
curl -s -H "X-Api-Key: $KEY" "$BASE/latest" | jq -c '.data[0]' || echo "Failed"

echo -e "\n2. Category DramaBox"
curl -s -H "X-Api-Key: $KEY" "$BASE/category" | jq -c '.' || echo "Failed"

echo -e "\n3. Trending DramaBox"
curl -s -H "X-Api-Key: $KEY" "$BASE/trending" | jq -c '.data[0]' || echo "Failed"

echo -e "\n4. Detail/Allepisode DramaBox"
# We need a valid dramabox ID. Let's use search to find one first.
SEARCH=$(curl -s -H "X-Api-Key: $KEY" "$BASE/search?q=love" | jq -r '.data[0].id')
if [ "$SEARCH" != "null" ] && [ -n "$SEARCH" ]; then
  curl -s -H "X-Api-Key: $KEY" "$BASE/allepisode?id=$SEARCH" | jq -c '{title: .drama.title, eps: .drama.episodes}' || echo "Failed"
  echo -e "\n5. Episode Stream DramaBox"
  curl -s -H "X-Api-Key: $KEY" "$BASE/episode?id=$SEARCH&ep=1" | jq -c '{success: .success, stream: .primary}' || echo "Failed"
else
  echo "Search failed, cannot test detail."
fi
