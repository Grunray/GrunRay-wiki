# Footer — GrunRay 页脚（纯 HTML）

页脚交互参考「主内容盖板压住固定页脚、滚到底自下而上揭开」的常见实现（如 Eric-Terminal `page-cover`）：

- **内容覆盖文字**：`.page-cover`（不透明页面层，`z-index: 2`）压在固定页脚（`z-index: 1`）之上；滚到底时主内容上移，露出下方绿底黑字
- **绿底品牌字**：`footer/16gl-*.svg` 排列为 **G R U N R A Y**（R 复用 `16gl-R.svg`）
- **揭开动画**：品牌区 `scaleY` / 进度缓动（Vue 版用 `--reveal-progress`）
- **鼠标拖影**：每字母 20 条横切片；在 **`.brand-letter__slice` 横条**上测距（非 inner），指针椭圆范围内仅几条横带错位
- **顶栏**：外链 / 版权 / ICP 胶囊条，与品牌区分阶段显示/收回

## 预览

在浏览器中直接打开：

```
footer/index.html
```

无需构建或 dev server。

## DOM 对照

| 本 demo | 说明 |
|---------|------|
| `.footer-c5KzRY` | 固定页脚根 |
| `.container-AbNPWn` | `footer` 容器 |
| `.container_distortion-T_UT23` | 品牌扭曲区 |
| `.content-rrUxd3` | 品牌内容区 |

Vue 项目中的等价实现见 `frontend/src/components/layout/FooterGrunRayPanel.vue`、`FooterGrunRayBrand.vue`、`composables/useFooterGrunRayReveal.ts` 与 `styles/footer-grunray.css`。
