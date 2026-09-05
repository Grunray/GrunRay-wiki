<template>
  <div class="detail-skel" aria-busy="true" aria-label="加载中">
    <div class="sk-row ui-skeleton sk-back" />
    <div class="sk-mast">
      <div class="sk-zone">
        <div class="sk-row ui-skeleton sk-title" />
        <div class="sk-row ui-skeleton sk-line" />
        <div class="sk-row ui-skeleton sk-line sk-line--mid" />
        <div class="sk-tags">
          <span class="ui-skeleton sk-pill" />
          <span class="ui-skeleton sk-pill" />
        </div>
      </div>
      <div class="sk-split">
        <div class="sk-zone">
          <div class="sk-row ui-skeleton sk-h2" />
          <div class="sk-row ui-skeleton sk-line" />
          <div class="sk-row ui-skeleton sk-line sk-line--short" />
        </div>
        <div class="sk-zone sk-zone--actions">
          <div class="sk-row ui-skeleton sk-h2" />
          <div class="sk-row ui-skeleton sk-line sk-line--mid" />
        </div>
      </div>
    </div>
    <div class="sk-blocks">
      <div v-for="i in 4" :key="i" class="sk-row ui-skeleton sk-line" :class="{ 'sk-line--short': i % 2 === 0 }" />
    </div>
  </div>
</template>

<style scoped>
.detail-skel {
  display: flex;
  flex-direction: column;
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
  border-top: 1px solid var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.sk-zone {
  padding: 1.05rem 1.35rem 1rem;
}

.sk-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.55fr);
  border-top: 1px solid var(--color-border);
}

.sk-zone--actions {
  border-left: 1px solid var(--color-border);
}

.sk-title {
  width: 68%;
  height: 1.55rem;
  margin-bottom: 0.6rem;
}

.sk-line {
  height: 0.85rem;
  margin-bottom: 0.4rem;
}

.sk-line--mid {
  width: 80%;
}

.sk-line--short {
  width: 50%;
}

.sk-tags {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.sk-pill {
  width: 3rem;
  height: 1.45rem;
  border-radius: var(--radius-sm, 6px);
}

.sk-h2 {
  width: 42%;
  height: 0.7rem;
  margin-bottom: 0.65rem;
}

.sk-blocks {
  min-height: 8rem;
}

@media (max-width: 720px) {
  .sk-split {
    grid-template-columns: 1fr;
  }

  .sk-zone--actions {
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>
