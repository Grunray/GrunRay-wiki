0. 
.venv\Scripts\activate.bat
. .\venv\Scripts\Activate.ps1
cd backend; . .\venv\Scripts\Activate.ps1; python run.py;
cd frontend; npm run dev;

1. （可选）顶部导航栏花里胡哨的效果，鼠标光标没悬停在导航栏上时，文字收缩，仅显示图标，悬停时，文字展开，显示文字和图标。像灵动岛一样，鼠标悬停时，导航栏向下展开一些，图标和文字同时显示。这里注意鼠标光标在边界位置的判定问题，不然鼠标悬停在边界位置时，导航栏会一直展开，或者想点击某个按钮时，导航栏会突然收起。
2. 导航栏做成跟踪导航栏（高亮效果会移动）
3. 液态玻璃效果在文章这些部分可以关闭



7. 文章部分，“系列、难度”部分，屏幕向下滑动后，在左侧“弹”一下展示出“文章标题、OI-wiki快捷链接、标签tags”。

8. 音乐播放器的音量调节器，打开一个小容器，有吊图，根据音量的高低来判断展示什么图片/gif，像拖拉机的摇杆一样按住拖动，
图片/gif预选：动力danking，维斯塔潘麦昆

9. 给 背景/触发效果 （1）浅色模式下：添加竹子生长的效果；（2）深色模式下：雪花❄
这里提示词已经写了，但是效果不符合我的预期，感觉使用svg图标的话不太行，AI理解不了我的意思，之后试着采用html+css动画实现吧
提示词这里备份一遍：

卡片悬停光效主要位置：frontend/src/styles/main.css。
核心选择器：.card、.card::after、.card:hover、.card:hover::after。
具体机制是：
.card::after 放了一层渐变高光（linear-gradient），悬停时在 .card:hover::after 里把 opacity 从 0 变成 1，并配合 transform 做扫光位移，.card:hover 还会做轻微上浮和阴影增强（translate3d + box-shadow）。
我们现在需要修改一下这个卡片悬停的效果，不仅是有悬停的光效，还需要添加一个效果：当悬停时，在卡片的右下角实现竹子的生长，竹子的svg图片是“designed\growing\bamboo\bamboo.svg”文件。你需要使用Animation动画，来达到竹子“生长”的效果，必要情况下可以拆分svg代码来实现。


11. 增加文章



