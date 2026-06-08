---
public_id: frag-opt-rant-server
mood: rant
status: published
created_at: '2026-06-08T22:10:00'
images: []
cover_index: 0
---

2 核 2G 的小破服务器，图片慢得我自己都嫌弃。结果今天扒开一看，后端居然一直拿 Flask 自带的开发服务器在裸奔——单线程、还开着 debug，请求全在排队。慢的哪是图片啊，是我自己埋的坑。顺手清仓库，还翻出个 40M 的打包 zip 和 1875 个误提交的 node_modules，过去的自己是真敢往上传。
