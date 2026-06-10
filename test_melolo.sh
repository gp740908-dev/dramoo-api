#!/bin/bash
KEY="dr_test_1234567890"
BASE="http://127.0.0.1:3000/api/melolo"

echo "1. Latest Melolo"
curl -s -H "X-Api-Key: $KEY" "$BASE/latest" | jq -c '.data[0]' || echo "Failed"

echo -e "\n2. Category Melolo"
curl -s -H "X-Api-Key: $KEY" "$BASE/category" | jq -c '.categories[0]' || echo "Failed"

echo -e "\n3. Trending Melolo"
curl -s -H "X-Api-Key: $KEY" "$BASE/trending" | jq -c '.data[0]' || echo "Failed"

echo -e "\n4. Detail/Allepisode"
curl -s -H "X-Api-Key: $KEY" "$BASE/allepisode?id=aku-di-supermarket-akhir-zaman" | jq -c '{title: .drama.title, eps: .drama.episodes}' || echo "Failed"

echo -e "\n5. Episode Stream"
curl -s -H "X-Api-Key: $KEY" "$BASE/episode?id=aku-di-supermarket-akhir-zaman&ep=1" | jq -c '{success: .success, stream: .primary}' || echo "Failed"
