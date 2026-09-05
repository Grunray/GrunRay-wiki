<template>
  <div class="detail-skel" aria-busy="true" aria-label="加载中">
    <div class="sk-row ui-skeleton sk-back" />
    <div class="sk-mast">
      <div class="sk-row ui-skeleton sk-title" />
      <div class="sk-row ui-skeleton sk-line" />
      <div class="sk-row ui-skeleton sk-line sk-line--short" />
      <div class="sk-tags">
        <span class="ui-skeleton sk-pill" />
        <span class="ui-skeleton sk-pill" />
        <span class="ui-skeleton sk-pill sk-pill--sm" />
      </div>
    </div>
    <div class="sk-body">
      <div v-for="i in 5" :key="i" class="sk-row ui-skeleton sk-line" :class="{ 'sk-line--short': i % 3 === 0 }" />
    </div>
  </div>
</template>

<style scoped>
.detail-skel {
  display: flex;
  flex-direction: column;
  max-width: 42rem;
}

.sk-row {
  border-radius: var(--radius-sm, 6px);
}

.sk-back {
  width: 4.5rem;
  height: 0.85rem;
  margin-bottom: 1.4rem;
}

.sk-mast {
  margin: 0 0 1.4rem;
  padding: 1.05rem 1.35rem 1rem;
  border-top: 1px solid var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.sk-body {
  padding-top: 0.2rem;
}

.sk-title {
  width: 72%;
  height: 1.45rem;
  margin-bottom: 0.65rem;
}

.sk-line {
  height: 0.85rem;
  margin-bottom: 0.45rem;
}

.sk-line--short {
  width: 55%;
}

.sk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.sk-pill {
  width: 3.2rem;
  height: 1.5rem;
  border-radius: var(--radius-sm, 6px);
}

.sk-pill--sm {
  width: 2.4rem;
}
</style>
