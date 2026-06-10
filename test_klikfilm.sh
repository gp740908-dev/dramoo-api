curl -s "http://127.0.0.1:3000/api/klikfilm/latest" -H "X-Api-Key: drm_b93dc002511fdb55540f203cf712c1df4456722601ba6b7a" | jq -c '.data[:1]'
echo ""
curl -s "http://127.0.0.1:3000/api/klikfilm/search?q=cinta" -H "X-Api-Key: drm_b93dc002511fdb55540f203cf712c1df4456722601ba6b7a" | jq -c '.data[:1]'
echo ""
curl -s "http://127.0.0.1:3000/api/klikfilm/detail?url=https://klikfilm.com/v3/mobile/film/detail/5559/49" -H "X-Api-Key: drm_b93dc002511fdb55540f203cf712c1df4456722601ba6b7a" | jq -c '.drama'
