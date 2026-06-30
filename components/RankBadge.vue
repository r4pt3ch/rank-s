<script setup>
const props = defineProps({
  rank: { type: String, default: "F" },
  size: { type: String, default: "md" },
});

const colors = {
  F: "#8a8a8a", E: "#7a8a6a", D: "#5e8a6a", C: "#4a8aa0",
  B: "#4a6cc4", A: "#7a5cc4", S: "#c4a23c", SS: "#d4783c", SSS: "#d43c3c",
};

const color = computed(() => colors[props.rank] || "#8a8a8a");
const dims = computed(() => {
  if (props.size === "sm") return { minWidth: "28px", height: "22px", fontSize: "11px", borderWidth: "1px", radius: "7px" };
  if (props.size === "lg") return { minWidth: "56px", height: "40px", fontSize: "18px", borderWidth: "1px", radius: "8px" };
  if (props.size === "xl") return { minWidth: "120px", height: "92px", fontSize: "44px", borderWidth: "3px", radius: "14px" };
  return { minWidth: "38px", height: "28px", fontSize: "13px", borderWidth: "1px", radius: "7px" };
});
</script>

<template>
  <span
    :style="{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: dims.minWidth, height: dims.height, padding: '0 8px', borderRadius: dims.radius,
      background: color + (size === 'xl' ? '33' : '22'), border: `${dims.borderWidth} solid ${color}`, color,
      fontWeight: 800, fontSize: dims.fontSize, letterSpacing: '0.5px',
      boxShadow: size === 'xl' ? `0 0 22px ${color}55` : 'none',
    }"
  >
    {{ rank }}
  </span>
</template>
