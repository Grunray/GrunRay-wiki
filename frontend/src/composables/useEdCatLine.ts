/** 与 BlogView.updateCategoryLine 同一算法：量宽后位移 .ed-cat-line。 */

export function updateEdCatLine(group: HTMLElement | null) {
  if (!group) return
  const line = group.querySelector('.ed-cat-line') as HTMLElement | null
  const on = group.querySelector('.ed-cat.is-on') as HTMLElement | null
  if (!line || !on || group.offsetParent === null) return
  const g = group.getBoundingClientRect()
  const b = on.getBoundingClientRect()
  line.style.width = `${b.width}px`
  line.style.transform = `translateX(${b.left - g.left}px)`
  line.style.opacity = '1'
}

export function updateEdCatLines(root: ParentNode | null) {
  if (!root) return
  root.querySelectorAll<HTMLElement>('[data-cat-group]').forEach((group) => updateEdCatLine(group))
}
