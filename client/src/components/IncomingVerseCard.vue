<script setup lang="ts">
interface VerseCardVerse {
  verseId: string
  book: string
  chapter: number
  verse: number
  text: string
  timeLeft: number
  senderId: string
  progress: number
}

defineProps<{
  verse: VerseCardVerse
  isExpanded: boolean
  onToggle: () => void
}>()

const progressIcon: Record<number, string> = {
  0: '📦',
  1: '🎁',
  2: '📓',
  3: '📖',
}
</script>

<template>
  <div
    class="verse-card"
    :class="{ expanded: isExpanded }"
    @click="onToggle"
    tabindex="0"
    @keydown.enter="onToggle"
    @keydown.space.prevent="onToggle"
  >
    <div class="card-header">
      <span class="icon">{{ progressIcon[verse.progress] || '📦' }}</span>
      <span class="timer" :class="{ urgent: verse.timeLeft <= 3 }">
        {{ verse.timeLeft }}s
      </span>
    </div>
    <div v-if="isExpanded" class="card-body">
      <p class="verse-text">{{ verse.text }}</p>
      <div class="ref-hint">Identify this verse&rsquo;s reference to score 5 points</div>
    </div>
  </div>
</template>

<style scoped>
.verse-card {
  padding: 0.6rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.verse-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(201, 168, 76, 0.2);
}

.verse-card.expanded {
  background: rgba(201, 168, 76, 0.08);
  border-color: rgba(201, 168, 76, 0.35);
  box-shadow: 0 0 16px rgba(201, 168, 76, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.timer {
  font-family: var(--mono, monospace);
  font-size: 0.85rem;
  color: rgba(232, 224, 208, 0.6);
  font-variant-numeric: tabular-nums;
}

.timer.urgent {
  color: #ef4444;
  font-weight: 600;
}

.card-body {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(201, 168, 76, 0.12);
  animation: expand-in 0.2s ease-out;
}

.verse-text {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #e8e0d0;
}

.ref-hint {
  font-size: 0.75rem;
  color: rgba(232, 224, 208, 0.4);
  font-style: italic;
}

@keyframes expand-in {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 300px;
  }
}
</style>
