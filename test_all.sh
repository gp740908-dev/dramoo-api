#!/bin/bash
KEY="dr_test_1234567890"
BASE="http://127.0.0.1:3000/api/pinedrama"

echo "1. Latest"
curl -s -H "X-Api-Key: $KEY" "$BASE/latest" | jq -c '.data[0]' || echo "Failed"

echo -e "\n2. Search"
curl -s -H "X-Api-Key: $KEY" "$BASE/search?q=cinta" | jq -c '.data[0]' || echo "Failed"

echo -e "\n3. Category"
curl -s -H "X-Api-Key: $KEY" "$BASE/category" | jq -c '.categories[0]' || echo "Failed"

echo -e "\n4. Trending"
curl -s -H "X-Api-Key: $KEY" "$BASE/trending" | jq -c '.data[0]' || echo "Failed"

echo -e "\n5. Languages"
curl -s -H "X-Api-Key: $KEY" "$BASE/languages" | jq -c '.languages' || echo "Failed"

echo -e "\n6. All Episodes (allepisode)"
curl -s -H "X-Api-Key: $KEY" "$BASE/allepisode?id=loves-substitute" | jq -c '{title: .drama.title, eps: .drama.episodes, first_ep: .episode_list[0]}' || echo "Failed"

echo -e "\n7. Episode Stream"
curl -s -H "X-Api-Key: $KEY" "$BASE/episode?id=loves-substitute&ep=1" | jq -c '{success: .success, stream: .primary}' || echo "Failed"
